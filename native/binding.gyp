{
  "targets": [
    {
      "target_name": "addon",
      "sources": [
        "src/addon.cpp",
        "src/functions/ping.cpp",
        "src/functions/trigger_bsod.cpp",
        "src/functions/switch_visibility.cpp",
        "src/functions/hex_to_str.cpp",
        "src/functions/keyboard/key_listener.cpp",
        "src/functions/keyboard/key_map.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "src/include",
      ],
      "cflags!": ["-fno-exceptions"],
      "libs": []
    }
  ]
}
