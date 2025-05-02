const { St, GLib, Gio } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let gschema = null;

let button;

class KeepMenu extends PanelMenu.Button {
    constructor() {
        super(0.0, 'Google Keep');

        // Create a panel menu button
        button = new St.Bin({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            x_fill: true,
            y_fill: false,
            track_hover: true
        });

        let icon = new St.Icon({
            icon_name: 'document-open-recent-symbolic', // Replace with a more appropriate icon
            style_class: 'system-status-icon'
        });
        button.set_child(icon);
        this.add_child(button);

        // Add a menu item
        let menuItem = new PopupMenu.PopupMenuItem('Hello, World!');
        this.menu.addMenuItem(menuItem);

        // Add a separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparator());

        // Add a quit button
        let quitMenuItem = new PopupMenu.PopupMenuItem('Quit');
        quitMenuItem.connect('activate', () => {
            this.destroy();
        });
        this.menu.addMenuItem(quitMenuItem);
    }

    destroy() {
        super.destroy();
    }
}

let keepMenu;

function init() {
    log(`initializing ${Me.metadata.name}`);
}

function enable() {
    log(`enabling ${Me.metadata.name}`);

    keepMenu = new KeepMenu();
    Main.panel.addToStatusArea('google-keep-menu', keepMenu);
}

function disable() {
    log(`disabling ${Me.metadata.name}`);

    if (keepMenu) {
        keepMenu.destroy();
        keepMenu = null;
    }
}
