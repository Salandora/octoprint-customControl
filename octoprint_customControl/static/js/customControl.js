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

        self.onSettingsShown = function () {
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

        self._processInput = function (list) {
            var inputs = [];

            for (var i = 0; i < list.length; i++) {
                var input = {
                    name: ko.observable(list[i].name),
                    parameter: ko.observable(list[i].parameter),
                    defaultValue: ko.observable(list[i].defaultValue != "" ? list[i].defaultValue : undefined),
                };

                if (list[i].hasOwnProperty("slider") && typeof list[i].slider == "object") {
                    input.slider = {
                        min: ko.observable(list[i].slider.min),
                        max: ko.observable(list[i].slider.max),
                        step: ko.observable(list[i].slider.step),
                    }
                    
                    var param = list[i].hasOwnProperty("defaultValue") && !isNaN(list[i].defaultValue) && list[i].defaultValue != undefined && list[i].defaultValue != "" ? list[i].defaultValue : (list[i].slider.hasOwnProperty("min") && !isNaN(list[i].slider.min) && list[i].slider.min != undefined && list[i].slider.min != "" ? list[i].slider.min : 0);
                    if (typeof param == "string")
                        param = parseInt(param);

                    if (list[i].slider.hasOwnProperty("min") && param < list[i].slider.min)
                        param = list[i].slider.min;

                    if (list[i].slider.hasOwnProperty("max") && param > list[i].slider.max)
                        param = list[i].slider.max;

                    if (typeof param == "string")
                        param = parseInt(param);

                    input.value = ko.observable(param);
                }
                else {
                    input.slider = false;
                    input.value = ko.observable(!isNaN(list[i].defaultValue) ? list[i].defaultValue : undefined);
                }

                inputs.push(input);
            }

            return inputs;
        }
        self._processControl = function (parent, control) {
            if (control.processed) {
                control.id("settingsCustomControl_id" + self.staticID++);
            }
            else {
                control.id = ko.observable("settingsCustomControl_id" + self.staticID++);
            }
            control.parent = parent;

            if (control.processed) {
                if (control.hasOwnProperty("children")) {
                    control.children(self._processControls(control, control.children()));
                }

                return control;
            }

            if (control.hasOwnProperty("template") && control.hasOwnProperty("regex")) {
                control.template = ko.observable(control.template);
                control.regex = ko.observable(control.regex);
                control.defaultValue = ko.observable(control.defaultValue || "");
            }

            if (control.hasOwnProperty("children")) {
                control.children = ko.observableArray(self._processControls(control, control.children));
                if (!control.hasOwnProperty("layout") || !(control.layout == "vertical" || control.layout == "horizontal" || control.layout == "horizontal_grid"))
                    control.layout = ko.observable("vertical");
                else
                    control.layout = ko.observable(control.layout);

                if (control.hasOwnProperty("collapsed"))
                    control.collapsed = ko.observable(control.collapsed);
                else
                    control.collapsed = ko.observable(false);
            }
            
            if (control.hasOwnProperty("input")) {
                control.input = ko.observableArray(self._processInput(control.input));
            }

            control.name = ko.observable(control.name || "");

            control.width = ko.observable(control.hasOwnProperty("width") ? control.width : "2");
            control.offset = ko.observable(control.hasOwnProperty("offset") ? control.offset : "");

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
                return (customControl.hasOwnProperty("name") && customControl.name() != "") ? "settingsCustomControls_containerTemplate_collapsable" : "settingsCustomControls_containerTemplate_nameless";
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
            if (contextParent.attr('id') == "base") {
                self.customControlDialogViewModel.reset();

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

                self.customControlDialogViewModel.reset({ parent: parentElement });

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
            var element = self.element = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
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

            if (element.hasOwnProperty("name")) {
                data.name = element.name();
            }
            if (element.hasOwnProperty("template")) {
                data.template = element.template();
                data.regex = element.regex();
                data.defaultValue = element.defaultValue() || "";

                title = "Edit Output";
                type = "output";
            }
            if (element.hasOwnProperty("layout")) {
                data.layout = element.layout();
                data.collapsed = element.collapsed();

                title = "Edit Container";
                type = "container";
            }
            if (element.hasOwnProperty("command")) {
                data.commands = element.command;

                title = "Edit Command";
                type = "command";
            }
            if (element.hasOwnProperty("commands")) {
                var commands = "";
                _.each(element.commands, function (e, index, list) {
                    commands += e;
                    if (index < list.length)
                        commands += '\n';
                });
                data.commands = commands;

                title = "Edit Command";
                type = "command";
            }
            if (element.hasOwnProperty("script")) {
                data.script = element.script;

                title = "Edit Script command";
                type = "script";
            }
            if (element.hasOwnProperty("confirm")) {
                data.confirm = element.confirm;
            }
            if (element.hasOwnProperty("input"))
            {
                data.input = [];
                _.each(element.input(), function (element, index, list) {
                    data.input[index] = ko.mapping.toJS(element);
                });
            }

            if (element.hasOwnProperty("width")) {
                data.width = element.width();
            }
            if (element.hasOwnProperty("offset")) {
                data.offset = element.offset();
            }

            self.customControlDialogViewModel.reset(data);
            self.customControlDialogViewModel.title(gettext(title));
            self.customControlDialogViewModel.type(type);

            self.customControlDialogViewModel.show(function (ret) {
                var element = self.element;

                switch (self.customControlDialogViewModel.type()) {
                    case "container": {
                        element.name(ret.name);                           
                        element.layout(ret.layout);
                        element.collapsed(ret.collapsed);
                        break;
                    }
                    case "command": {
                        element.name(ret.name);

                        if (ret.command != undefined) {
                            element.command = ret.command;
                            delete element.commands;
                        }
                        if (ret.commands != undefined) {
                            element.commands = ret.commands;
                            delete element.command;
                        }

                        if (ret.confirm != "") {
                            element.confirm = ret.confirm;
                        }

                        if (ret.input != undefined) {
                            element.input(self._processInput(ret.input));
                        }
                        else
                            delete element.input;

                        // Command can also be a output
                        if (ret.hasOwnProperty("template")) {
                            if (element.hasOwnProperty("template"))
                                element.template(ret.template);
                            else
                                element.template = ko.observable(ret.template);

                            if (element.hasOwnProperty("regex"))
                                element.regex(ret.regex);
                            else
                                element.regex = ko.observable(ret.regex);

                            if (element.hasOwnProperty("defaultValue"))
                                element.defaultValue(ret.defaultValue);
                            else
                                element.defaultValue = ko.observable(ret.defaultValue);
                        }
                        else
                        {
                            if (element.hasOwnProperty("defaultValue"))
                                element.defaultValue(undefined);

                            delete element.template;
                            delete element.regex;
                            delete element.defaultValue;
                        }
                        break;
                    }
                    case "script": {
                        element.name(ret.name);
                        element.script = ret.script;

                        if (ret.confirm != "") {
                            element.confirm = ret.confirm;
                        }

                        if (ret.input != undefined) {
                            element.input(self._processInput(ret.input));
                        }
                        else
                            delete element.input;

                        break;
                    }
                    case "output": {
                        element.template(ret.template);
                        element.regex(ret.regex);
                        element.defaultValue(ret.defaultValue);
                        break;
                    }
                }

                if (element.parent && element.parent.layout() == "horizontal_grid") {
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
                case "editElement": {
                    self.editElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                case "deleteElement": {
                    self.deleteElement(invokedOn, contextParent, selectedMenu);
                    break;
                }
                default: {
                    if (selectedMenu.attr('cmd').startsWith("create")) {
                        switch (selectedMenu.attr('cmd')) {
                            case "createContainer": {
                                self.customControlDialogViewModel.title(gettext("Create container"));
                                self.customControlDialogViewModel.type("container");
                                break;
                            }
                            case "createCommand": {
                                self.customControlDialogViewModel.title(gettext("Create Command"));
                                self.customControlDialogViewModel.type("command");
                                break;
                            }
                            case "createScript": {
                                self.customControlDialogViewModel.title(gettext("Create Script"));
                                self.customControlDialogViewModel.type("script");
                                break;
                            }
                            case "createOutput": {
                                self.customControlDialogViewModel.title(gettext("Create Output"));
                                self.customControlDialogViewModel.type("output");
                                break;
                            }
                        }

                        self.createElement(invokedOn, contextParent, selectedMenu);
                    }
                    break;
                }
            }
        }

        self.editStyle = function (type) {
        }
       
        self.recursiveDeleteProperties = function (list) {
            for (var i = 0; i < list.length; i++) {
                if (!list[i].parent || (list[i].parent.hasOwnProperty("layout") && list[i].parent.layout() != "horizontal_grid"))
                {
                    delete list[i].width;
                    delete list[i].offset;
                }

                delete list[i].id;
                delete list[i].parent;
                delete list[i].processed;
                delete list[i].output;
                delete list[i].key;
                delete list[i].template_key;

                if (list[i].hasOwnProperty("width") && list[i].width() == "")
                    delete list[i].width;
                if (list[i].hasOwnProperty("offset") && list[i].offset() == "")
                    delete list[i].offset;

                if (!list[i].hasOwnProperty("name") || list[i].name() == "") {
                    delete list[i].name;
                    delete list[i].collapsable;
                }

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