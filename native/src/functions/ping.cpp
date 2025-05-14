#include <node_api.h>

#include "addon.h"

napi_value Ping(napi_env env, napi_callback_info info) {
    napi_value result;
    napi_get_boolean(env, true, &result);
    return result;
}
