#include <windows.h>
#include <node_api.h>

#include "addon.h"

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    DWORD pid = (DWORD)lParam;
    DWORD windowPid;
    GetWindowThreadProcessId(hwnd, &windowPid);
    if (windowPid == pid) {
        LONG_PTR exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        if ((exStyle & WS_EX_APPWINDOW) != 0) {
            exStyle &= ~WS_EX_APPWINDOW;
            SetWindowLongPtr(hwnd, GWL_EXSTYLE, exStyle);
            ShowWindow(hwnd, SW_HIDE);
        } else {
            exStyle |= WS_EX_APPWINDOW;
            SetWindowLongPtr(hwnd, GWL_EXSTYLE, exStyle);
            ShowWindow(hwnd, SW_SHOW);
        }
    }
    return TRUE;
}

napi_value SwitchVisibility(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value argv[1];
    napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
    if (argc != 1) {
        napi_throw_type_error(env, nullptr, "Wrong number of arguments");
        return nullptr;
    }
    napi_valuetype valuetype;
    napi_typeof(env, argv[0], &valuetype);
    if (valuetype != napi_number) {
        napi_throw_type_error(env, nullptr, "Wrong arguments");
        return nullptr;
    }
    DWORD pid;
    napi_get_value_uint32(env, argv[0], reinterpret_cast<uint32_t*>(&pid));
    bool result = EnumWindows(EnumWindowsProc, (LPARAM)pid);
    napi_value returnValue;
    napi_get_boolean(env, result, &returnValue);
    return returnValue;
}