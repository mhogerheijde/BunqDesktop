import url from "url";
import path from "path";
import log from "electron-log";
import electron from "electron";
import settings from "electron-settings";
import { app, Menu, Tray, nativeImage, ipcMain } from "electron";
import { devMenuTemplate } from "./menu/dev_menu_template";
import { editMenuTemplate } from "./menu/edit_menu_template";
import createWindow from "./helpers/window";
import registerShortcuts from "./helpers/shortcuts";
import registerTouchBar from "./helpers/touchbar";
import changePage from "./helpers/react_navigate";
import settingsHelper from "./helpers/settings";

import i18n from "./i18n-background";
import env from "./env";

// use english by default
i18n.changeLanguage("en");

// listen for changes in language in the client
ipcMain.on("change-language", (event, arg) => {
    i18n.changeLanguage(arg);
});

// listen for changes in settings path
ipcMain.on("change-settings-path", (event, newPath) => {
    settingsHelper.savePath(newPath);
});

const userDataPath = app.getPath("userData");

// hide/show different native menus based on env
const setApplicationMenu = () => {
    const menus = [editMenuTemplate];
    if (env.name === "development") {
        menus.push(devMenuTemplate);
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// returns an url formatted file location
const getWindowUrl = fileName => {
    return url.format({
        pathname: path.join(__dirname, fileName),
        protocol: "file:",
        slashes: true
    });
};

// Save userData in separate folders for each environment
if (env.name !== "production") {
    app.setPath("userData", `${userDataPath} (${env.name})`);
}

// setup the logger
log.transports.file.appName = "BunqDesktop";
log.transports.file.level = env.name === "development" ? "debug" : "warn";
log.transports.file.format = "{h}:{i}:{s}:{ms} {text}";
log.transports.file.file = `${userDataPath}${path.sep}BunqDesktop.${env.name}.log.txt`;

// hot reloading
if (process.env.NODE_ENV === "development") {
    require("electron-reload")(
        path.join(__dirname, `..${path.sep}app${path.sep}**`)
    );
}

// set the correct path before the app loads
settings.setPath(settingsHelper.loadPath());

app.on("ready", () => {
    setApplicationMenu();

    const USE_NATIVE_FRAME_STORED = settings.get("USE_NATIVE_FRAME");
    const USE_NATIVE_FRAME =
        USE_NATIVE_FRAME_STORED !== undefined &&
        USE_NATIVE_FRAME_STORED === true;

    // setup the main window
    const mainWindow = createWindow("main", {
        frame: USE_NATIVE_FRAME,
        webPreferences: { webSecurity: false },
        width: 1000,
        height: 800
    });

    // load the app.html file to get started
    mainWindow.loadURL(getWindowUrl("app.html"));

    registerShortcuts(mainWindow, app);
    registerTouchBar(mainWindow, i18n);

    if (env.name === "development") {
        mainWindow.openDevTools();
    }

    const trayIcon = nativeImage.createFromPath(
        path.join(
            __dirname,
            `..${path.sep}app${path.sep}images${path.sep}32x32.png`
        )
    );

    const createTrayIcon = () => {
        // setup the tray handler
        const tray = new Tray(trayIcon);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: i18n.t("Dashboard"),
                click: () => changePage(mainWindow, "/")
            },
            {
                label: i18n.t("Pay"),
                click: () => changePage(mainWindow, "/pay")
            },
            {
                label: i18n.t("Request"),
                click: () => changePage(mainWindow, "/request")
            },
            {
                label: i18n.t("Cards"),
                click: () => changePage(mainWindow, "/card")
            },
            { type: "separator" },
            {
                label: i18n.t("Quit"),
                click: () => app.quit()
            }
        ]);
        tray.setContextMenu(contextMenu);
        tray.setToolTip("BunqDesktop");

        // Event handlers
        tray.on("click", () => {
            // show app on single click
            if (!mainWindow.isVisible()) mainWindow.show();
            tray.destroy();
        });
    };

    mainWindow.on("minimize", function(event) {
        const minimizeToTray = !!settings.get("MINIMIZE_TO_TRAY");
        if (minimizeToTray) {
            createTrayIcon();
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on("close", function(event) {
        app.quit();
    });

    // reload the window if the system goes into sleep mode
    electron.powerMonitor.on("resume", () => {
        log.debug("resume");
        mainWindow.reload();
    });
    electron.powerMonitor.on("suspend", () => {
        log.debug("suspend");
    });
});

app.on("window-all-closed", () => {
    app.quit();
});
