$(function () {
    function ContainerDialogViewModel(parameters) {
        var self = this;

        self.element = ko.observable();

        self.layouts = ko.observableArray([
            { name: gettext("Vertical"), key: "vertical" },
            { name: gettext("Horizontal"), key: "horizontal" },
            { name: gettext("Horizontal grid"), key: "horizontal_grid" }
        ]);

        self.show = function (f) {
            var dialog = $("#containerDialog");
            var primarybtn = $('.btn-primary', dialog);

            primarybtn.unbind('click').bind('click', f);

            dialog.modal({
                show: 'true',
                backdrop: 'static',
                keyboard: false
            });
        }
    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
        ContainerDialogViewModel,
        [],
        "#containerDialog"
    ]);
});