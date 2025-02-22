define([
    "lib/lodash",
    "app/driverList",
    "text!app/templates/wizard.html",
    "i18n!app/nls/wizard",
    "css!app/templates/wizard.css"
], function (_, driverList, wizardTemplate, i18n) {
    return function (alvrSettings) {

        function GetAndCheckGPUSupport() {
            let gpu = "";
            $.ajax({
                type: "GET",
                url: `graphics-devices`,
                contentType: "application/json;charset=UTF-8",
                processData: false,
                async: false,
                success: function(res) {
                    if (res.length > 0) {
                        gpu = res[0]
                    }
                },
            });

            var unsupportedGPURegex = new RegExp("(Radeon (((VIVO|[2-9][0-9][0-9][0-9]) ?\S*)|VE|LE|X(1?[0-9][0-5]0))"+
                           "|GeForce ((8[3-9][0-9]|9[0-3][0-9]|94[0-5])[AM]|GT 1030|GTX 9([2-3][0-9]|40)MX|MX(110|130|1[5-9][0-9]|2[0-9][0-9]|3[0-2][0-9]|330|350|450)))"+
                           "|Intel")

            if (unsupportedGPURegex.test(gpu)) {
                return '🔴 '+ gpu +i18n.GPUUnsupported;
            } else {
                return '🟢 '+ gpu +i18n.GPUSupported;
            }
        }
        
        this.showWizard = function () {
            var currentPage = 0;
            var compiledTemplate = _.template(wizardTemplate);
            var template = compiledTemplate(i18n);

            $("#setupWizard").remove();
            $("body").append(template);
            $(document).ready(() => {

                $('#setupWizard').modal({
                    backdrop: 'static',
                    keyboard: false
                });

                $("#GPUSupportText").text(GetAndCheckGPUSupport());

                $("#addFirewall").click(() => {
                    $.get("firewall-rules/add", undefined, (res) => {
                        if (res == -1) {
                            Lobibox.notify("error", {
                                size: "mini",
                                rounded: true,
                                delayIndicator: false,
                                sound: false,
                                msg: i18n.firewallFailed
                            })
                        } else {
                            Lobibox.notify("success", {
                                size: "mini",
                                rounded: true,
                                delayIndicator: false,
                                sound: false,
                                msg: i18n.firewallSuccess
                            })
                        }
                    })
                })

                $(".poseOffsetButton").change((ev) => {
                    var target = $(ev.target);

                    var poseTimeOffsetTarget = $("#_root_headset_controllers_content_poseTimeOffset");
                    var clientsidePrediction = $("#_root_headset_controllers_content_clientsidePrediction");

                    switch (target.attr("value")) {
                        case "oculus":
                            clientsidePrediction.prop("checked", true);
                            break;
                        case "normal":
                            clientsidePrediction.prop("checked", false);
                            poseTimeOffsetTarget.val("0.01");
                            break;
                        case "medium":
                            clientsidePrediction.prop("checked", false);
                            poseTimeOffsetTarget.val("-0.03");
                            break;
                        case "fast":
                            clientsidePrediction.prop("checked", false);
                            poseTimeOffsetTarget.val("-1");
                            break;
                        default:
                            break;
                    }
                    alvrSettings.storeParam(poseTimeOffsetTarget);
                    alvrSettings.storeParam(clientsidePrediction);

                    console.log(target.attr("value"))
                })

                $(".performanceOptions").change((ev) => {
                    var target = $(ev.target);

                    var renderResolution = $("#_root_video_renderResolution_scale-choice-");
                    renderResolution.parent().parent().children().filter(".active").removeClass("active")
                    renderResolution.prop("checked", true);
                    alvrSettings.storeParam(renderResolution);

                    var targetResolution = $("#_root_video_recommendedTargetResolution_scale-choice-");
                    targetResolution.parent().parent().children().filter(".active").removeClass("active")
                    targetResolution.prop("checked", true);
                    alvrSettings.storeParam(targetResolution);

                    var renderResolutionScale = $("#_root_video_renderResolution_scale");
                    var targetResolutionScale = $("#_root_video_recommendedTargetResolution_scale");
                    var enableFfrTarget = $("#_root_video_foveatedRendering_enabled");
                    var ffrStrengthTarget = $("#_root_video_foveatedRendering_content_strength");
                    var bitrateTarget = $("#_root_video_encodeBitrateMbs");
                    var preferredFps = $("#_root_video_preferredFps");

                    switch (target.attr("value")) {
                        case "compatibility":
                            renderResolutionScale.val(0.75);
                            targetResolutionScale.val(0.75);
                            bitrateTarget.val(15);
                            enableFfrTarget.prop("checked", true);
                            ffrStrengthTarget.val(2);
                            preferredFps.val(72);
                            
                            var h264CodecTarget = $("#_root_video_codec_H264-choice-");
                            h264CodecTarget.parent().parent().children().filter(".active").removeClass("active")
                            h264CodecTarget.prop("checked", true);
                            alvrSettings.storeParam(h264CodecTarget);
                            break;
                        case "visual_quality":
                            renderResolutionScale.val(1);
                            targetResolutionScale.val(1);
                            bitrateTarget.val(40);
                            enableFfrTarget.prop("checked", false);
                            preferredFps.val(90);

                            var hevcCodecTarget = $("#_root_video_codec_HEVC-choice-");
                            hevcCodecTarget.parent().parent().children().filter(".active").removeClass("active")
                            hevcCodecTarget.prop("checked", true);
                            alvrSettings.storeParam(hevcCodecTarget);
                            break;
                        default:
                            break;
                    }
                    alvrSettings.storeParam(renderResolutionScale);
                    alvrSettings.storeParam(targetResolutionScale);
                    alvrSettings.storeParam(enableFfrTarget);
                    alvrSettings.storeParam(ffrStrengthTarget);
                    alvrSettings.storeParam(bitrateTarget);
                    alvrSettings.storeParam(preferredFps);

                    console.log(target.attr("value"))
                })

                $("#wizardNextButton").click(() => {

                    if (currentPage >= $("#wizardMain").children().length - 1) {
                        $('#setupWizard').modal('hide');
                        alvrSettings.disableWizard();
                        return;
                    }

                    if (currentPage >= $("#wizardMain").children().length - 2) {
                        $("#wizardNextButton").text(i18n.buttonClose)
                    }


                    $($("#wizardMain").children().get(currentPage)).hide();
                    $($("#wizardMain").children().get(currentPage + 1)).show();

                    $("#wizardNextButton").blur();

                    currentPage += 1;
                })

            });

        }



    };
});