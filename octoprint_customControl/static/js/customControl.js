$(function () {
    function CustomControlViewModel(parameters) {
        var self = this;

        self.loginState = parameters[0];
        self.settingsViewModel = parameters[1];
        self.controlViewModel = parameters[2];
        self.containerDialogViewModel = parameters[3];

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

        self._processControl = function (parent, control) {
            control.id = ko.observable("settingsCustomControl_id" + self.staticID++);
            control.parent = parent;

            if (control.hasOwnProperty("template") && control.hasOwnProperty("key") && control.hasOwnProperty("template_key") && !control.hasOwnProperty("output"))
                control.output = ko.observable("");

            if (control.hasOwnProperty("children")) {
                if (control.processed) {
                    control.children(self._processControls(control, control.children()));
                    if (control.hasOwnProperty("layout") && !(control.layout() == "vertical" || control.layout() == "horizontal" || control.layout() == "horizontal_grid"))
                        control.layout("vertical");
                    else if (!control.hasOwnProperty("layout"))
                        control.layout = ko.observable("vertical");
                }
                else {
                    control.name = ko.observable(control.name);
                    control.children = ko.observableArray(self._processControls(control, control.children));
                    if (!control.hasOwnProperty("layout") || !(control.layout == "vertical" || control.layout == "horizontal" || control.layout == "horizontal_grid"))
                        control.layout = ko.observable("vertical");
                    else
                        control.layout = ko.observable(control.layout);

                    control.width = ko.observable(control.hasOwnProperty("width") ? control.width : "2");
                    control.offset = ko.observable(control.hasOwnProperty("offset") ? control.offset : "");
                }
            }

            if (control.hasOwnProperty("input")) {
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

        self.controlContextMenu = function (invokedOn, contextParent, selectedMenu)
        {
            switch (selectedMenu.attr('cmd')) {
                case "createContainer": {
                    if (invokedOn.attr('id') == "base") {
                        self.containerDialogViewModel.element({
                            name: undefined,
                            children:[],
                            layout: "vertical",
                            width: "2",
                            offset: ""
                        });

                        self.containerDialogViewModel.show(function (e) {
                            self.controlsFromServer.push(self.containerDialogViewModel.element());
                            self.rerenderControls();
                        });
                    }
                    else {
                        var parentElement = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
                        if (parentElement == undefined) {
                            self._showPopup({
                                title: gettext("Something went wrong while creating the new Element"),
                                type:"error"
                            });
                            return;
                        }

                        self.containerDialogViewModel.element({
                            parent: parentElement,
                            name: undefined,
                            children: [],
                            layout: "vertical",
                            width: "2",
                            offset: ""
                        });

                        self.containerDialogViewModel.show(function (e) {
                            parentElement.children.push(self._processControl(parentElement, self.containerDialogViewModel.element()));
                        });
                    }
                    break;
                }
                case "editContainer": {
                    var element = self.searchElement(self.controlsFromServer, contextParent.attr('id'));
                    if (element == undefined) {
                        self._showPopup({
                            title: gettext("Something went wrong while creating the new Element"),
                            type: "error"
                        });
                        return;
                    }

                    var dialog = $('#containerDialog');
                    var primarybtn = $('.btn-primary', dialog);

                    var el = {
                        parent: element.parent,
                        name: ko.observable(element.name()),
                        layout: ko.observable(element.layout()),
                        width: ko.observable("2"),
                        offset: ko.observable("")
                    };
                    if (element.hasOwnProperty("width"))
                        el.width(element.width());
                    if (element.hasOwnProperty("offset"))
                        el.offset(element.offset());

                    self.containerDialogViewModel.element(el);
                    primarybtn.unbind('click').bind('click', function (e) {
                        var ele = self.containerDialogViewModel.element();

                        element.name(ele.name());
                        element.layout(ele.layout());
                        if (ele.parent.layout() == "horizontal_grid") {
                            if (ele.width() != undefined)
                                element.width(ele.width());

                            if (ele.offset() != undefined)
                                element.offset(ele.offset());
                        }
                    });

                    dialog.modal({
                        show: 'true',
                        backdrop: 'static',
                        keyboard: false
                    });
                    break;
                }
                case "deleteContainer": {
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
        ["loginStateViewModel", "settingsViewModel", "controlViewModel", "containerDialogViewModel"],
        "#settings_plugin_octoprint_customControl"
    ]);
});