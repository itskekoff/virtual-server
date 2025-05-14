#ifndef ADDON_H
#define ADDON_H

#include <node_api.h>
#include "keyboard/key_listener.h"

napi_value Ping(napi_env env, napi_callback_info info);
napi_value HexToStr(napi_env env, napi_callback_info info);
napi_value TriggerBSOD(napi_env env, napi_callback_info info);
napi_value SwitchVisibility(napi_env env, napi_callback_info info);

#endif
