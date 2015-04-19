$(function () {
    function customControlDialogViewModel(parameters) {
        var self = this;

        self.element = ko.observable(ko.mapping.fromJS({
            name: undefined,
            commands: "",
            script: "",
            javascript: "",
            enabled: "",
            children: [],
            input: [],
            layout: "vertical",
            regex: "",
            template: "",
            confirm: "",
            width: "2",
            offset: "",
            parent: undefined
        }));

        self.title = ko.observable(gettext("Create Container"));
        self.type = ko.observable("container");

        self.useInputs = ko.observable(false);
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
            { name: gettext("Output"), key: "output" }
        ]);

        self.hasSlider = ko.computed(function () {
            if (self.element() == undefined || self.element().input == undefined)
                return false;

            _.each(self.element().input(), function (element, index, list) {
                if (element.hasOwnProperty("slider"))
                    return true;
            });
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
                commands: "",
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

            if (typeof data == "object")
                element = _.extend(element, data);

            self.element(ko.mapping.fromJS(element));
        }

        self.show = function (f) {
            var dialog = $("#customControlDialog");
            var primarybtn = $('.btn-primary', dialog);

            primarybtn.unbind('click').bind('click', function (e) {
                var obj = ko.mapping.toJS(self.element());

                var el = {};
                switch (self.type()) {
                    case "container": {
                        el.name = obj.name;
                        el.layout = obj.layout;
                        el.children = [];

                        el.width = obj.width;
                        el.offset = obj.offset;

                        break;
                    }
                    case "command": {
                        el.name = obj.name;
                        if (obj.commands.indexOf('\n') == -1)
                            el.command = obj.commands;
                        else
                            el.commands = obj.commands;

                        el.width = obj.width;
                        el.offset = obj.offset;

                        if (self.useInputs()) {
                            el.input = [];
                            _.each(obj.input, function (element, index, list) {
                                var input = {
                                    name: element.name,
                                    parameter: element.parameter,
                                    default: element.default
                                };
                                if (element.hasOwnProperty("slider")) {
                                    input["slider"] = {
                                    };

                                    if (element.slider.hasOwnProperty("min") && element.slider.min != "")
                                        input.slider.min = element.slider.min;
                                    if (element.slider.hasOwnProperty("max") && element.slider.max != "")
                                        input.slider.max = element.slider.max;
                                    if (element.slider.hasOwnProperty("step") && element.slider.step != "")
                                        input.slider.step = element.slider.step;
                                }
                            });
                        }
                        break;
                    }
                    case "output": {
                        el.template = obj.template;
                        el.regex = obj.regex;

                        el.width = obj.width;
                        el.offset = obj.offset;

                        break;
                    }
                }
                f(el);
            });

            dialog.modal({
                show: 'true',
                backdrop: 'static',
                keyboard: false
            });
        }
    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        customControlDialogViewModel,
        [],
        "#customControlDialog"
    ]);
});