$(function () {
    function customControlDialogViewModel(parameters) {
        var self = this;

        self.element = ko.observable();

        self.title = ko.observable(gettext("Create Container"));
        self.type = ko.observable("container");

        self.useInputs = ko.observable(false);
        self.useConfirm = ko.observable(false);
        self.useOutput = ko.observable(false);
        self.useJavaScript = ko.observable(false);
        self.useEnabled = ko.observable(false);

        self.layouts = ko.observableArray([
            { name: gettext("Vertical"), key: "vertical" },
            { name: gettext("Horizontal"), key: "horizontal" },
            { name: gettext("Horizontal grid"), key: "horizontal_grid" }
        ]);
        self.types = ko.observableArray([
            { name: gettext("Container"), key: "container" },
            { name: gettext("Command"), key: "command" },
            { name: gettext("Script"), key: "script" },
            { name: gettext("Output"), key: "output" },
        ]);

        self.hasSlider = ko.computed(function () {
            if (self.element() == undefined || self.element().input == undefined)
                return false;

            var inputs = self.element().input()
            for(var i = 0; i < inputs.length; i++)    
            {
                if (inputs[i].hasOwnProperty("slider")) {
                    if (typeof inputs[i].slider == "object")
                        return true;
                }
            }
            return false;
        });
        self.span = function(parameter) {
            return ko.computed(function () {
                if (self.hasSlider())
                    return "span2";

                switch (parameter) {
                    case "name":
                    case "parameter":
                        return "span4";
                    case "default":
                        return "span3";
                }

                return "span2";
            });
        }

        self.reset = function (data) {
            var element = {
                name: undefined,
                collapsed: false,
                commands: "",
                confirm: "",
                defaultValue: "",
                script: "",
                javascript: "",
                enabled: "",
                input: [],
                layout: "vertical",
                regex: "",
                template: "",
                confirm: "",
                width: "2",
                offset: "",
                parent: undefined
            };

            if (typeof data == "object") {
                element = _.extend(element, data);

                self.useConfirm(data.hasOwnProperty("confirm"));
                self.useInputs(data.hasOwnProperty("input"));
                self.useOutput(data.hasOwnProperty("template"));
            }

            self.element(ko.mapping.fromJS(element));
        }
        self.show = function (f) {
            var dialog = $("#customControlDialog");
            var primarybtn = $('div.modal-footer .btn-primary', dialog);

            primarybtn.unbind('click').bind('click', function (e) {
                var obj = ko.mapping.toJS(self.element());

                var el = {};
                switch (self.type()) {
                    case "container": {
                        el.name = obj.name;
                        el.layout = obj.layout;
                        el.collapsed = obj.collapsed;

                        el.children = [];
                        break;
                    }
                    case "command": {
                        el.name = obj.name;
                        if (obj.commands.indexOf('\n') == -1)
                            el.command = obj.commands;
                        else
                            el.commands = obj.commands.split('\n');

                        if (self.useConfirm()) {
                            el.confirm = obj.confirm;
                        }

                        if (self.useInputs()) {
                            el.input = [];
                            _.each(obj.input, function (element, index, list) {
                                var input = {
                                    name: element.name,
                                    parameter: element.parameter,
                                    defaultValue: element.defaultValue
                                };
                                if (element.hasOwnProperty("slider") && element.slider != false) {
                                    input["slider"] = {
                                    };

                                    if (element.slider.hasOwnProperty("min") && element.slider.min != "")
                                        input.slider.min = element.slider.min;
                                    if (element.slider.hasOwnProperty("max") && element.slider.max != "")
                                        input.slider.max = element.slider.max;
                                    if (element.slider.hasOwnProperty("step") && element.slider.step != "")
                                        input.slider.step = element.slider.step;
                                }

                                el.input.push(input);
                            });
                        }

                        if (self.useOutput()) {
                            el.template = obj.template;
                            el.regex = obj.regex;
                            el.defaultValue = obj.defaultValue;
                        }
                        break;
                    }
                    case "script":
                        {
                            el.name = obj.name;
                            el.script = obj.script;

                            if (self.useConfirm()) {
                                el.confirm = obj.confirm;
                            }

                            if (self.useInputs()) {
                                el.input = [];
                                _.each(obj.input, function (element, index, list) {
                                    var input = {
                                        name: element.name,
                                        parameter: element.parameter,
                                        defaultValue: element.defaultValue
                                    };
                                    if (element.hasOwnProperty("slider") && element.slider != false) {
                                        input["slider"] = {
                                        };

                                        if (element.slider.hasOwnProperty("min") && element.slider.min != "")
                                            input.slider.min = element.slider.min;
                                        if (element.slider.hasOwnProperty("max") && element.slider.max != "")
                                            input.slider.max = element.slider.max;
                                        if (element.slider.hasOwnProperty("step") && element.slider.step != "")
                                            input.slider.step = element.slider.step;
                                    }

                                    el.input.push(input);
                                });
                            }
                            break;
                        }
                    case "output": {
                        el.template = obj.template;
                        el.regex = obj.regex;
                        el.defaultValue = obj.defaultValue;
                        break;
                    }
                }

                el.width = obj.width;
                el.offset = obj.offset;

                f(el);
            });

            dialog.modal({
                show: 'true',
                backdrop: 'static',
                keyboard: false
            });
        }

        self.removeInput = function (data) {
            self.element().input.remove(data);
        }
        self.addInput = function () {
            var obj = {
                name: ko.observable(""),
                parameter: ko.observable(""),
                defaultValue: ko.observable(""),
                slider: false
            }

            self.element().input.push(obj);
        }
        self.addSliderInput = function () {
            var obj = {
                name: ko.observable(""),
                parameter: ko.observable(""),
                defaultValue: ko.observable(""),
                slider: {
                    min: ko.observable(""),
                    max: ko.observable(""),
                    step: ko.observable("")
                }
            }

            self.element().input.push(obj);
        }
    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        customControlDialogViewModel,
        [],
        "#customControlDialog"
    ]);
});