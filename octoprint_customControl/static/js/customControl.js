$(function () {
    function CustomControlViewModel(parameters) {
        var self = this;

        self.loginState = parameters[0];
        self.settingsViewModel = parameters[1];
        self.controlViewModel = parameters[2];

        self.customControlDialogViewModel = parameters[3];

        self.popup = undefined;

        self.controls = ko.observableArray([]);

        self.controlsFromServer = [];
        self.additionalControls = [];

        self.staticID = 0;

        self._showPopup = function (options, eventListeners) {
            if (self.popup !== undefined) {
                self.popup.remove();
            }
            self.popup = new PNotify(options);

            if (eventListeners) {
                var popupObj = self.popup.get();
                _.each(eventListeners, function (value, key) {
                    popupObj.on(key, value);
                })
            }
        };

        self.onStartup = function () {
            self.requestData();
        };

        self.requestData = function () {
            $.ajax({
                url: API_BASEURL + "printer/command/custom",
                method: "GET",
                dataType: "json",
                success: function (response) {
                    self._fromResponse(response);
                }
            });
        };

        self._fromResponse = function (response) {
            self.controlsFromServer = response.controls;
            self.rerenderControls();
        };

        self.rerenderControls = function () {

            // TODO: Brainstorming about how to handle additionalControls...

            self.staticID = 0;
            self.controls(self._processControls(undefined, self.controlsFromServer))
        };

        self._processControls = function (parent, controls) {
            for (var i = 0; i < controls.length; i++) {
                controls[i] = self._processControl(parent, controls[i]);
            }
            return controls;
        };

        self._processInput = function (control) {
            for (var i = 0; i < control.input.length; i++) {
                if (!control.processed) {
                    control.input[i].value = ko.observable(control.input[i].default);
                    control.input[i].default = ko.observable(control.input[i].default);
                }

                if (control.processed)
                    control.input[i].value(control.input[i].default());

                if (!control.input[i].hasOwnProperty("slider"))
                    control.input[i].slider = ko.observable(false);
                else if (!control.processed)
                    control.input[i].slider = ko.observable(control.input[i].slider);
            }
        }
        self._processControl = function (parent, control) {
            control.id = ko.observable("settingsCustomControl_id" + self.staticID++);
            control.parent = parent;

            if (control.hasOwnProperty("template") && control.hasOwnProperty("regex")) {
                if (control.processed) {
                    control.template(control.template());
                    control.regex(control.regex());
                }
                else {
                    control.template = ko.observable(control.template);
                    control.regex = ko.observable(control.regex);
                }
            }

            if (control.hasOwnProperty("children")) {
                if (control.processed) {
                    control.children(self._processControls(control, control.children()));
                    if (control.hasOwnProperty("layout") && !(control.layout() == "vertical" || control.layout() == "horizontal" || control.layout() == "horizontal_grid"))
                        control.layout("vertical");
                    else if (!control.hasOwnProperty("layout"))
                        control.layout = ko.observable("vertical");
                }
                else {
                    control.children = ko.observableArray(self._processControls(control, control.children));
                    if (!control.hasOwnProperty("layout") || !(control.layout == "vertical" || control.layout == "horizontal" || control.layout == "horizontal_grid"))
                        control.layout = ko.observable("vertical");
                    else
                        control.layout = ko.observable(control.layout);
                }
            }
            
            if (!control.processed) {
                if (control.hasOwnProperty("name"))
                    control.name = ko.observable(control.name);

                control.width = ko.observable(control.hasOwnProperty("width") ? control.width : "2");
                control.offset = ko.observable(control.hasOwnProperty("offset") ? control.offset : "");
            }

            if (control.hasOwnProperty("input")) {
                self._processInput(control);
            }

            var js;
            if (control.hasOwnProperty("javascript")) {
                js = control.javascript;

                // if js is a function everything's fine already, but if it's a string we need to eval that first
                /*if (!_.isFunction(js)) {
                    control.javascript = function (data) {
                        eval(js);
                    };
                }*/
            }

            if (control.hasOwnProperty("enabled")) {
                js = control.enabled;

                // if js is a function everything's fine already, but if it's a string we need to eval that first
                /*if (!_.isFunction(js)) {
                    control.enabled = function (data) {
                        return eval(js);
                    }
                }*/
            }

            control.processed = true;
            return control;
        };

        self.displayMode = function (customControl) {
            if (customControl.hasOwnProperty("children")) {
                return "settingsCustomControls_containerTemplate";
            } else {
                return "settingsCustomControls_controlTemplate";
            }
        }

        self.rowCss = function (customControl) {
            var span = "span2";
            var offset = "";
            if (customControl.hasOwnProperty("width") && customControl.width() != "") {
                span = "span" + customControl.width();
            }
            if (customControl.hasOwnProperty("offset") && customControl.offset() != "") {
                offset = "offset" + customControl.offset();
            }
            return span + " " + offset;
        };

        self.searchElement = function (list, id) {
            for (var i = 0; i < list.length; i++)
            {
                if (list[i].id() == id)
                    return list[i];

                if (list[i].hasOwnProperty("children")) {
                    var element = self.searchElement(list[i].children(), id);
                    if (element != undefined)
                        return element;
                }
            }

            return undefined;
        }

        self.createElement = function (invokedOn, contextParent, selectedMenu) {
            if (invokedOn.attr('id') == "base") {
                self.customControlDialogViewModel.show(function (ret) {
                    self.controlsFromServer.push(ret);
                    self.rerenderControls();
                });
            }
            else {
                var parentElement = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
                if (parentElement == undefined) {
                    self._showPopup({
                        title: gettext("Something went wrong while creating the new Element"),
                        type: "error"
                    });
                    return;
                }

                self.customControlDialogViewModel.show(function (ret) {
                    parentElement.children.push(self._processControl(parentElement, ret));
                });
            }
        }
        self.deleteElement = function (invokedOn, contextParent, selectedMenu) {
            var element = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
            if (element == undefined) {
                self._showPopup({
                    title: gettext("Something went wrong while creating the new Element"),
                    type: "error"
                });
                return;
            }

            showConfirmationDialog("", function (e) {
                if (element.parent != undefined)
                    element.parent.children.remove(element);
                else {
                    self.controlsFromServer = _.without(self.controlsFromServer, element);
                    self.rerenderControls();
                }
            });
        }
        self.editElement = function (invokedOn, contextParent, selectedMenu) {
            var element = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
            if (element == undefined) {
                self._showPopup({
                    title: gettext("Something went wrong while creating the new Element"),
                    type: "error"
                });
                return;
            }

            var title = "Edit Container";
            var type = "container";
            var data = {
                parent: element.parent,
            };

            if (element.hasOwnProperty("name"))
                data.name = element.name();
            if (element.hasOwnProperty("layout")) {
                data.layout = element.layout();
                title = "Edit Container";
                type = "container";
            }
            if (element.hasOwnProperty("command")) {
                data.commands = element.command;
                title = "Edit Command";
                type = "command";
            }
            if (element.hasOwnProperty("commands")) {
                data.commands = element.commands;
                title = "Edit Command";
                type = "command";
            }
            if (element.hasOwnProperty("input"))
            {
                data.input = [];
                _.each(element.input(), function (element, index, list) {
                    data.input[index] = ko.mapping.toJS(element);
                });
            }
            if (element.hasOwnProperty("template")) {
                data.template = element.template();
                title = "Edit Output";
                type = "output";
            }
            if (element.hasOwnProperty("regex"))
                data.regex = element.regex();

            if (element.hasOwnProperty("width"))
                data.width = element.width();
            if (element.hasOwnProperty("offset"))
                data.offset = element.offset();

            self.customControlDialogViewModel.reset(data);
            self.customControlDialogViewModel.title(gettext(title));
            self.customControlDialogViewModel.type(type);

            self.customControlDialogViewModel.show(function (ret) {
                switch (self.customControlDialogViewModel.type()) {
                    case "container": {
                        element.name(ret.name);
                        element.layout(ret.layout);
                    }
                    case "command": {
                        if (ret.hasOwnProperty("name"))
                            element.name(ret.name);

                        delete element.command;
                        delete element.commands;
                        delete element.input;

                        if (ret.command != undefined)
                            element.command = ret.command;
                        if (ret.commands != undefined)
                            element.commands = ret.commands;

                        if (ret.input != undefined) {
                            element.input = ret.input;
                            self._processInput(element);
                        }
                        break;
                    }
                    case "output": {
                        element.template(ret.template);
                        element.regex(ret.regex);
                    }
                }

                if (element.parent.layout() == "horizontal_grid") {
                    if (ret.width != undefined && ret.width != "")
                        element.width(ret.width);

                    if (ret.offset != undefined && ret.offset != "")
                        element.offset(ret.offset);
                }
            });
        }

        self.controlContextMenu = function (invokedOn, contextParent, selectedMenu)
        {
            switch (selectedMenu.attr('cmd')) {
                case "createContainer": {
                    self.customControlDialogViewModel.reset();
                    self.customControlDialogViewModel.title(gettext("Create container"));
                    self.customControlDialogViewModel.type("container");

                    self.createElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                case "createCommand": {
                    self.customControlDialogViewModel.reset();
                    self.customControlDialogViewModel.title(gettext("Create Command"));
                    self.customControlDialogViewModel.type("command");

                    self.createElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                case "createOutput": {
                    self.customControlDialogViewModel.reset();
                    self.customControlDialogViewModel.title(gettext("Create Output"));
                    self.customControlDialogViewModel.type("output");

                    self.createElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                case "deleteElement": {
                    self.deleteElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                case "editElement": {
                    self.editElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
            }
        }

        self.editStyle = function (type) {
        }
       
        self.recursiveDeleteProperties = function (list) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].parent && list[i].parent.hasOwnProperty("layout") && list[i].parent.layout() != "horizontal_grid")
                {
                    delete list[i].width;
                    delete list[i].offset;
                }

                delete list[i].id;
                delete list[i].parent;
                delete list[i].processed;
                delete list[i].output;

                if (list[i].hasOwnProperty("children"))
                     self.recursiveDeleteProperties(list[i].children());
            }
        }
        self.onSettingsBeforeSave = function () {
            self.recursiveDeleteProperties(self.controlsFromServer);
            self.settingsViewModel.settings.plugins.octoprint_customControl.controls = self.controlsFromServer;
        }

        self.onEventSettingsUpdated = function (payload) {
            self.requestData();
        }
    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        CustomControlViewModel,
        ["loginStateViewModel", "settingsViewModel", "controlViewModel", "customControlDialogViewModel"],
        "#settings_plugin_octoprint_customControl"
    ]);
});