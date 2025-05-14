#include "keyboard/key_listener.h"
#include "keyboard/key_map.h"

#include <thread>
#include <atomic>
#include <windows.h>
#include <node_api.h>
#include <string>
#include <unordered_map>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <array>

struct KeyPressEvent {
    struct KeyInfo {
        std::string name;
        std::string raw;
    } key;
    struct MetaInfo {
        bool altKey = false;
        bool shiftKey = false;
        bool ctrlKey = false;
    } meta;
};

static std::atomic<bool> isRunning(false);

static std::queue<KeyPressEvent> eventQueue;
static std::mutex queueMutex;
static std::condition_variable queueCondition;

static std::array<bool, 256> keyStates = {false};

napi_threadsafe_function tsfn;

void KeyListenerThread() {
    while (isRunning.load()) {
        for (int key = 0; key <= 255; ++key) {
            bool isKeyDown = (GetAsyncKeyState(key) & 0x8000) != 0;
            if (isKeyDown && !keyStates[key]) {
                KeyPressEvent event;
                if (keyMap.count(key)) {
                    event.key.name = keyMap.at(key);
                } else {
                    event.key.name = "Unknown";
                }
                event.key.raw = std::to_string(key);
                event.meta.altKey = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
                event.meta.shiftKey = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
                event.meta.ctrlKey = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;

                {
                    std::lock_guard<std::mutex> lock(queueMutex);
                    eventQueue.push(event);
                }
                queueCondition.notify_one();
            }
            keyStates[key] = isKeyDown;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

void EventWorkerThread() {
    while (isRunning.load()) {
        KeyPressEvent* event = nullptr;

        {
            std::unique_lock<std::mutex> lock(queueMutex);
            queueCondition.wait(lock, [] { return !eventQueue.empty() || !isRunning.load(); });
            if (!isRunning.load() && eventQueue.empty()) {
                break;
            }
            event = new KeyPressEvent(eventQueue.front());
            eventQueue.pop();
        }

        napi_call_threadsafe_function(tsfn, event, napi_tsfn_blocking);
    }
}

void TSFNCallback(napi_env env, napi_value jsCallback, void* context, void* data) {
    KeyPressEvent* event = static_cast<KeyPressEvent*>(data);

    napi_value eventObject;
    napi_create_object(env, &eventObject);

    napi_value keyObject;
    napi_create_object(env, &keyObject);

    napi_value nameValue, rawValue;
    napi_create_string_utf8(env, event->key.name.c_str(), NAPI_AUTO_LENGTH, &nameValue);
    napi_create_string_utf8(env, event->key.raw.c_str(), NAPI_AUTO_LENGTH, &rawValue);

    napi_set_named_property(env, keyObject, "name", nameValue);
    napi_set_named_property(env, keyObject, "raw", rawValue);

    napi_set_named_property(env, eventObject, "key", keyObject);

    napi_value metaObject;
    napi_create_object(env, &metaObject);

    napi_value altValue, shiftValue, ctrlValue;
    napi_get_boolean(env, event->meta.altKey, &altValue);
    napi_get_boolean(env, event->meta.shiftKey, &shiftValue);
    napi_get_boolean(env, event->meta.ctrlKey, &ctrlValue);

    napi_set_named_property(env, metaObject, "altKey", altValue);
    napi_set_named_property(env, metaObject, "shiftKey", shiftValue);
    napi_set_named_property(env, metaObject, "ctrlKey", ctrlValue);

    napi_set_named_property(env, eventObject, "meta", metaObject);

    napi_value argv[1] = { eventObject };
    napi_status status;
    if (jsCallback == nullptr) {
        napi_throw_error(env, nullptr, "JavaScript callback is nullptr.");
        return;
    }
    napi_value global;
    status = napi_get_global(env, &global);
    if (status != napi_ok) return;
    status = napi_call_function(env, global, jsCallback, 1, argv, nullptr);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to call JavaScript callback.");
        return;
    }
    delete event;
}

napi_value StartKeyListener(napi_env env, napi_callback_info info) {
size_t argc = 1;
    napi_value args[1];
    napi_value thisArg;

    napi_get_cb_info(env, info, &argc, args, &thisArg, nullptr);

    if (argc < 1) {
        napi_throw_type_error(env, nullptr, "Callback function is required.");
        return nullptr;
    }

    napi_valuetype type;
    napi_typeof(env, args[0], &type);

    if (type != napi_function) {
        napi_throw_type_error(env, nullptr, "Argument must be a function.");
        return nullptr;
    }

    napi_ref callbackRef;
    napi_create_reference(env, args[0], 1, &callbackRef);

    napi_value resourceName;
    napi_create_string_utf8(env, "KeyListener", NAPI_AUTO_LENGTH, &resourceName);
    napi_status status = napi_create_threadsafe_function(
        env,
        args[0],        // callback function
        nullptr,        // async_resource
        resourceName,   // async_resource_name
        0,              // max_queue_size
        1,              // initial_thread_count
        nullptr,        // thread_finalize_data
        nullptr,        // thread_finalize_cb
        nullptr,        // context
        TSFNCallback,   // call_js_cb
        &tsfn           // result
    );

    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to create threadsafe function.");
        return nullptr;
    }

    isRunning.store(true);

    std::thread(KeyListenerThread).detach();
    std::thread(EventWorkerThread).detach();

    return nullptr;
}

napi_value StopKeyListener(napi_env env, napi_callback_info info) {
    isRunning.store(false);
    queueCondition.notify_all();

    napi_release_threadsafe_function(tsfn, napi_tsfn_release);

    return nullptr;
}