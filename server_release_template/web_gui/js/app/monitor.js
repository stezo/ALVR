define([
    "text!app/templates/addClientModal.html",
    "text!app/templates/monitor.html",
    "json!../../session",
    "lib/lodash",
    "i18n!app/nls/monitor",
    "i18n!app/nls/notifications",
    "css!app/templates/monitor.css",
    "js/lib/epoch.js",
    "css!js/lib/epoch.css",
], function(addClientModalTemplate, monitorTemplate, session, _, i18n, i18nNotifications) {
    return function(alvrSettings) {

        var notificationLevels = [];   
        var timeoutHandler;
        var latencyGraph;        
        var framerateGraph;     

        function logInit() {
            var url = window.location.href
            var arr = url.split("/");


            const log_listener = new WebSocket("ws://" + arr[2] + "/log");

            log_listener.onopen = (ev) => {
                console.log("Log listener started")
            }

            log_listener.onerror = (ev) => {
                console.log("Log error", ev)
            }

            log_listener.onclose = (ev) => {
                console.log("Log closed", ev)
                logInit();
            }

            log_listener.addEventListener('message', function(e) { addLogLine(e.data) });

            $("#_root_extra_notificationLevel-choice-").change((ev) => {
                initNotificationLevel();
            });

        }

        function init() {
            var compiledTemplate = _.template(monitorTemplate);
            var template = compiledTemplate(i18n);

            compiledTemplate = _.template(addClientModalTemplate);
            var template2 = compiledTemplate(i18n);

            $("#monitor").append(template);

            $(document).ready(() => {
                logInit();
                initNotificationLevel();
                initPerformanceGraphs();

                updateClients();

                $("#showAddClientModal").click(() => {
                    $("#addClientModal").remove();
                    $("body").append(template2);
                    $(document).ready(() => {
                        $('#addClientModal').modal({
                            backdrop: 'static',
                            keyboard: false
                        });
                        $("#clientAddButton").click(() => {
                            //TODO: input validation
                            const type = $("#clientTypeSelect").val();
                            const ip = $("#clientIP").val();
                            //manualAddClient(type, ip)
                            $('#addClientModal').modal('hide');
                            $('#addClientModal').remove();
                        })
                    });
                })

            });
        }

        function updateClients() {
            $("#newClientsDiv").empty();
            $("#trustedClientsDiv").empty();

            Object.entries(session.clientConnections).forEach(pair => {
                var hostname = pair[0];
                var connection = pair[1];
                //var address = connection.lastLocalIp;
                var type = connection.deviceName;

                if (connection.trusted) {
                    addTrustedClient(type, hostname);
                } else {
                    addNewClient(type, hostname);
                }
            });
        }

        function initNotificationLevel() {
            var level = $("input[name='notificationLevel']:checked").val();

            switch (level) {
                case "error":
                    notificationLevels = ["[ERROR]"];
                    break;
                case "warning":
                    notificationLevels = ["[ERROR]", "[WARN]"];
                    break;
                case "info":
                    notificationLevels = ["[ERROR]", "[WARN]", "[INFO]"];
                    break;
                case "debug":
                    notificationLevels = ["[ERROR]", "[WARN]", "[INFO]", "[DEBUG]"];
                    break;
                default:
                    notificationLevels = [];
                    break;
            }

            //console.log("Notification levels are now: ", notificationLevels);

        }

        function addNewClient(type, hostname) {
            const id = hostname.replace(/\./g, '');

            if ($("#newClient_" + id).length > 0) {
                console.warn("Client already in new list:", type, hostname);
                return;
            }

            if ($("#trustedClient_" + id).length > 0) {
                console.warn("Client already in trusted list:", type, hostname);
                return;
            }

            var client = `<div class="card client" type="${type}" hostname="${hostname}" id="newClient_${id}">
                        ${type} (${hostname}) <button type="button" class="btn btn-primary">${i18n["addTrustedClient"]}</button>
                        </div>`

            $("#newClientsDiv").append(client);
            $(document).ready(() => {
                $("#newClient_" + id + " button").click(() => {
                    $.ajax({
                        type: "POST",
                        url: `client/trust`,
                        contentType: "application/json;charset=UTF-8",
                        data: JSON.stringify([hostname, null]),
                    });
                })
            });
        }

        function addTrustedClient(type, hostname) {
            const id = hostname.replace(/\./g, '');

            if ($("#newClient_" + id).length > 0) {
                console.warn("Client already in new list:", type, hostname);
                return;
            }

            if ($("#trustedClient_" + id).length > 0) {
                console.warn("Client already in trusted list:", type, hostname);
                return;
            }

            var client = `<div class="card client" type="${type}" hostname="${hostname}" id="trustedClient_${id}">
                        ${type} (${hostname}) <button type="button" class="btn btn-primary">${i18n["removeTrustedClient"]}</button>
                        </div>`

            $("#trustedClientsDiv").append(client);
            $(document).ready(() => {
                $("#trustedClient_" + id + " button").click(() => {
                    $.ajax({
                        type: "POST",
                        url: `client/remove`,
                        contentType: "application/json;charset=UTF-8",
                        data: JSON.stringify([hostname, null]),
                    });
                })
            });
        }

        function addLogLine(line) {
            var idObject = undefined;

            console.log(line);

            var json_start_idx = line.indexOf("#{");
            var json_end_idx = line.indexOf("}#");
            if (json_start_idx != -1 && json_end_idx != -1) {
                idObject = line.substring(json_start_idx + 1, json_end_idx + 1);
            }

            var split = line.split(" ");
            line = line.replace(split[0] + " " + split[1], "");

            const skipWithoutId = $("#_root_extra_excludeNotificationsWithoutId").prop("checked");

            if (idObject !== undefined) {
                idObject = JSON.parse(idObject);
                handleJson(idObject);
            }

            if (notificationLevels.includes(split[1].trim())) {
                if (!(skipWithoutId && idObject === undefined) && Lobibox.notify.list.length < 2) {
                    var box = Lobibox.notify(getNotificationType(split[1]), {
                        size: "mini",
                        rounded: true,
                        delayIndicator: false,
                        sound: false,
                        position: "bottom left",
                        title: getI18nNotification(idObject, line, split[1]).title,
                        msg: getI18nNotification(idObject, line, split[1]).msg
                    })
                }
            }

            var row = `<tr><td>${split[0]}</td><td>${split[1]}</td><td>${line.trim()}</td></tr>`;
            $("#loggingTable").append(row);
            if ($("#loggingTable").children().length > 500) {
                $("#loggingTable tr").first().remove();
            }
        }

        function getI18nNotification(idObject, line, level) {
            if (idObject === undefined) {
                return { "title": level, "msg": line };
            } else {
                //TODO: line could contain additional info for the msg

                if (i18nNotifications[idObject.id + ".title"] !== undefined) {
                    return { "title": i18nNotifications[idObject.id + ".title"], "msg": i18nNotifications[idObject.id + ".msg"] };
                } else {
                    console.log("Notification with additional info: ", idObject.id)
                    return { "title": level, "msg": idObject.id + ": " + line };
                }
            }
        }

        function getNotificationType(logSeverity) {
            switch (logSeverity.trim()) {
                case "[ERROR]":
                    return "error";
                case "[WARN]":
                    return "warning";
                case "[INFO]":
                    return "info";
                case "[DEBUG]":
                    return "default";
                default:
                    return "default";
            }
        }

        function handleJson(json) {
            switch (json.id) {
                case "statistics":
                    updateStatistics(json.content);
                    break;
                case "sessionUpdated":
                    updateSession();
                    break;
                default:
                    break;
            }
        }

        function initPerformanceGraphs(){
            var now = parseInt(new Date().getTime() / 1000);
            latencyGraph = $("#latencyGraphArea").epoch({
                type: "time.area",
                axes: ["left", "bottom"],
                data: [                    
                    {
                        label: "Encode",
                        values: [{ time: now, y: 0 }]
                    },
                    {
                        label: "Decode",
                        values: [{ time: now, y: 0 }]
                    },
                    {
                        label: "Transport",
                        values: [{ time: now, y: 0 }]
                    },
                    {
                        label: "Other",
                        values: [{ time: now, y: 0 }]
                    }]
            });         

            framerateGraph = $("#framerateGraphArea").epoch({
                type: "time.line",
                axes: ["left", "bottom"],
                data: [
                    {
                        label: "Server FPS",
                        values: [{ time: now, y: 0 }]
                    },
                    {
                        label: "Client FPS",
                        values: [{ time: now, y: 0 }]
                    }]
            });
        }
       
        function updatePerformanceGraphs(statistics) {
            $("#divPerformanceGraphsContent").show();
            $("#divPerformanceGraphsEmptyMsg").hide();
            
            var now = parseInt(new Date().getTime() / 1000);
            var otherLatency = statistics["totalLatency"] - statistics["encodeLatency"] - statistics["decodeLatency"] - statistics["transportLatency"];

            latencyGraph.push([
                { time: now, y: statistics["encodeLatency"] },
                { time: now, y: statistics["decodeLatency"] },
                { time: now, y: statistics["transportLatency"] },
                { time: now, y: otherLatency}]);

            framerateGraph.push([
                { time: now, y: statistics["serverFPS"] },
                { time: now,  y: statistics["clientFPS"] }]);
        }

        function updateStatistics(statistics) {
            clearTimeout(timeoutHandler);
            $("#connectionCard").hide();
            $("#statisticsCard").show();

            for (var stat in statistics) {
                $("#statistic_" + stat).text(statistics[stat]);
            }
            timeoutHandler = setTimeout(() => {
                $("#connectionCard").show();
                $("#statisticsCard").hide();
            }, 2000);

            updatePerformanceGraphs(statistics);
        }

        var isUpdating = false;

        function updateSession() {
            //ugly hack to avoid loop
            if (isUpdating) {
                return;
            }
            isUpdating = true;
            $.getJSON("session", function(newSession) {
                session = newSession;
                updateClients();
                alvrSettings.updateSession(session);
                isUpdating = false;
            });
        }

        function pack(data) {
            const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
            var count = data.length;
            var str = "";

            for (var index = 0; index < count;) {
                var ch = data[index++];
                if (ch & 0x80) {
                    var extra = extraByteMap[(ch >> 3) & 0x07];
                    if (!(ch & 0x40) || !extra || ((index + extra) > count))
                        return null;

                    ch = ch & (0x3F >> extra);
                    for (; extra > 0; extra -= 1) {
                        var chx = data[index++];
                        if ((chx & 0xC0) != 0x80)
                            return null;

                        ch = (ch << 6) | (chx & 0x3F);
                    }
                }

                str += String.fromCharCode(ch);
            }

            return str;
        }

        init();

    }
});