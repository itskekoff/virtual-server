#include <string>
#include <stdexcept>
#include <node_api.h>

#include "addon.h"

napi_value HexToStr(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (argc != 1) {
        return nullptr;
    }
    napi_valuetype valuetype;
    napi_typeof(env, args[0], &valuetype);
    if (valuetype != napi_string) {
        return nullptr;
    }
    size_t hexStringLength;
    char* hexString;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &hexStringLength);
    hexString = new char[hexStringLength + 1];
    napi_get_value_string_utf8(env, args[0], hexString, hexStringLength + 1, nullptr);
    size_t byteArrayLength = hexStringLength / 2;
    unsigned char* byteArray = new unsigned char[byteArrayLength];
    if (hexStringLength % 2 != 0) {
        delete[] hexString;
        delete[] byteArray;
        return nullptr;
    }
    for (size_t i = 0; i < hexStringLength; i += 2) {
        std::string byteStr(hexString + i, 2);
        try {
            byteArray[i / 2] = static_cast<unsigned char>(std::stoi(byteStr, nullptr, 16));
        } catch (const std::invalid_argument& e) {
            delete[] hexString;
            delete[] byteArray;
            return nullptr;
        }
    }
    napi_value result;
    napi_create_string_utf8(env, reinterpret_cast<const char*>(byteArray), byteArrayLength, &result);
    delete[] hexString;
    delete[] byteArray;
    return result;
}
