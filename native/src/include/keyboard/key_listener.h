#ifndef KEY_LISTENER_H
#define KEY_LISTENER_H

#include <node_api.h>

#include "addon.h"

napi_value StartKeyListener(napi_env env, napi_callback_info info);
napi_value StopKeyListener(napi_env env, napi_callback_info info);

#endif
