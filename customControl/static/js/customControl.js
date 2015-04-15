$(function () {
    $.fn.isChildOf = function (element) {
        return $(element).has(this).length > 0;
    }

    // from http://jsfiddle.net/KyleMit/X9tgY/
    $.fn.contextMenu = function (settings) {
        return this.each(function () {
            // Open context menu
            $(this).on("contextmenu", function (e) {
                // return native menu if pressing control
                if (e.ctrlKey) return;

                $(settings.menuSelector)
                    .data("invokedOn", $(e.target))
                    .show()
                    .css({
                        position: "absolute",
                        left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
                        top: getMenuPosition(e.clientY, 'height', 'scrollTop'),
                        "z-index": 9999
                    }).off('click')
                    .on('click', function (e) {
                        if (e.target.tagName.toLowerCase() == "input")
                            return;

                        $(this).hide();
                
                        var $invokedOn = $(this).data("invokedOn");
                        var $selectedMenu = $(e.target);
                        
                        settings.menuSelected.call(this, $invokedOn, $selectedMenu);
                });

                return false;
            });

            //make sure menu closes on any click
            $(document).click(function () {
                $(settings.menuSelector).hide();
            });
        });

        function getMenuPosition(mouse, direction, scrollDir) {
            var win = $(window)[direction](),
                scroll = $(window)[scrollDir](),
                menu = $(settings.menuSelector)[direction](),
                position = mouse + scroll;

            // opening menu would pass the side of the page
            if (mouse + menu > win && menu < mouse)
                position -= menu;

            return position;
        }
    };

    ko.bindingHandlers.contextMenu = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = ko.utils.unwrapObservable(valueAccessor());

            $(element).contextMenu(val);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = ko.utils.unwrapObservable(valueAccessor());

            $(element).contextMenu(val);
        }
    }

    function CustomControlViewModel(parameters) {
        var self = this;

        self.loginState = parameters[0];
        self.settingsViewModel = parameters[1];
        self.controlViewModel = parameters[2];

        self.controls = ko.observableArray([]);

        self.controlsFromServer = [];
        self.additionalControls = [];

        self.staticID = 0;

        self.onBeforeBinding = function () {
            self.settings = self.settingsViewModel.settings;
            self.rerenderControls();
        };

        self.onAllBound = function (allViewModels) {
            var additionalControls = [];
            _.each(allViewModels, function (viewModel) {
                if (viewModel.hasOwnProperty("getAdditionalControls")) {
                    additionalControls = additionalControls.concat(viewModel.getAdditionalControls());
                }
            });
            if (additionalControls.length > 0) {
                self.additionalControls = additionalControls;
                self.rerenderControls();
            }
        };

        self.rerenderControls = function () {
            self.staticID = 0;

            var allControls = self.controlsFromServer.concat(self.additionalControls);
            self.controls(self._processControls(allControls))
        };

        self._processControls = function (controls) {
            for (var i = 0; i < controls.length; i++) {
                controls[i] = self._processControl(controls[i]);
            }
            return controls;
        };

        self._processControl = function (control) {
            if (control.hasOwnProperty("template") && control.hasOwnProperty("key") && control.hasOwnProperty("template_key") && !control.hasOwnProperty("output")) {
                control.output = ko.observable("");
            }

            if (control.hasOwnProperty("children")) {
                if (control.processed)
                    control.children = ko.observableArray(self._processControls(control.children()));
                else
                    control.children = ko.observableArray(self._processControls(control.children));

                if (!control.hasOwnProperty("layout") || !(control.layout == "vertical" || control.layout == "horizontal")) {
                    control.layout = "vertical";
                }
            }

            if (control.hasOwnProperty("input")) {
                for (var i = 0; i < control.input.length; i++) {
                    control.input[i].value = ko.observable(control.input[i].default);
                    if (!control.input[i].hasOwnProperty("slider")) {
                        control.input[i].slider = false;
                    }
                }
            }

            var js;
            if (control.hasOwnProperty("javascript")) {
                js = control.javascript;

                // if js is a function everything's fine already, but if it's a string we need to eval that first
                if (!_.isFunction(js)) {
                    control.javascript = function (data) {
                        eval(js);
                    };
                }
            }

            if (control.hasOwnProperty("enabled")) {
                js = control.enabled;

                // if js is a function everything's fine already, but if it's a string we need to eval that first
                if (!_.isFunction(js)) {
                    control.enabled = function (data) {
                        return eval(js);
                    }
                }
            }

            control.id = "settingsCustomControl_id" + self.staticID++;
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

        self.searchElement = function (list, id) {
            for (var i = 0; i < list.length; i++)
            {
                if (list[i].id == id)
                    return list[i];

                if (list[i].hasOwnProperty("children")) {
                    var element = self.searchElement(list[i].children(), id);
                    if (element != undefined)
                        return element;
                }
            }

            return undefined;
        }

        self.controlContextMenu = function (invokedOn, selectedMenu)
        {
            if (selectedMenu.attr('cmd') == "createContainer") {
                if (invokedOn.attr('id') == "base") {
                    // TODO: make a create dialog
                    self.controlsFromServer.push({ children: [], id: "settingsCustomControl_id" + self.staticID++ });
                    self.rerenderControls();
                }
                else {
                    var parentElement = self.searchElement(self.controlsFromServer, invokedOn.attr('id'));
                    if (parentElement == undefined)
                    {
                        // TODO: make an Warning dialog
                        alert("Something went wrong while creating the new Element");
                        return;
                    }

                    // TODO: make a create dialog
                    parentElement.children.push(self._processControl({ children: [], id: "settingsCustomControl_id" + self.staticID++ }));
                }
            }
        }

        self.editStyle = function (type) {
        }
       
    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        CustomControlViewModel,
        ["loginStateViewModel", "settingsViewModel", "controlViewModel"],
        "#settings_plugin_customControl"
    ]);
});