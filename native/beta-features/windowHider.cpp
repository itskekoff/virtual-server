#include <windows.h>
#include <tlhelp32.h>
#include <iostream>

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    DWORD pid;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid == (DWORD)lParam) {
        LONG_PTR exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        if ((exStyle & WS_EX_APPWINDOW) != 0) {
            exStyle &= ~WS_EX_APPWINDOW;
            SetWindowLongPtr(hwnd, GWL_EXSTYLE, exStyle);
            ShowWindow(hwnd, SW_HIDE);
            std::cout << "Окно " << hwnd << " скрыто из ALT+TAB и видимости." << std::endl;
        } else {
            exStyle |= WS_EX_APPWINDOW;
            SetWindowLongPtr(hwnd, GWL_EXSTYLE, exStyle);
            ShowWindow(hwnd, SW_SHOW);
            std::cout << "Окно " << hwnd << " показано в ALT+TAB и видимости." << std::endl;
        }
    }
    return TRUE;
}

bool switchWindowVisibility(DWORD pid) {
    if (!EnumWindows(EnumWindowsProc, (LPARAM)pid)) {
        return false;
    }
    return true;
}

int main() {
    DWORD pidToControl;
    std::cout << "Введите PID процесса: ";
    std::cin >> pidToControl;

    if (switchWindowVisibility(pidToControl)) {
        std::cout << "Операция выполнена успешно." << std::endl;
    } else {
        std::cout << "Операция завершилась с ошибкой." << std::endl;
    }

    return 0;
}