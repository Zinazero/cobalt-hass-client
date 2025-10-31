var SERVER_URL = window.env.SERVER_URL;
var TOKEN = window.env.TOKEN;

function log(msg) {
    console.log(msg);
    var logEl = document.getElementById('log');
    if (!logEl) return;
    logEl.textContent += msg + '\n';
}

function fetchEntities(callback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", SERVER_URL + "/api/states", true);
    xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                errorCallback(xhr.status);
            }
        }
    };
    xhr.send();
}

function activateScene(entityId) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", SERVER_URL + "/api/services/scene/turn_on", true);
    xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ entity_id: entityId }));
}

function runScript(entityId) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", SERVER_URL + "/api/services/script/turn_on", true);
    xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ entity_id: entityId }));
}

function toggleEntity(entity, callback) {
    var domain = entity.entity_id.split(".")[0];
    var service = entity.state === "on" ? "turn_off" : "turn_on";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", SERVER_URL + "/api/services/" + domain + "/" + service, true);
    xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (callback) callback();
            } else {
                log("Toggle failed with status: " + xhr.status);
            }
        }
    };

    xhr.send(JSON.stringify({ entity_id: entity.entity_id }));
}

function filterByDomain(entities, domain) {
    var result = [];
    for (var i = 0; i < entities.length; i++) {
        if (entities[i].entity_id.indexOf(domain + ".") === 0) {
            result.push(entities[i]);
        }
    }
    return result;
}

function renderScenes(scenes) {
    var container = document.getElementById("scenes");
    container.innerHTML = "";
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var fullName = scene.attributes.friendly_name || scene.entity_id;

        // Only show scenes with [CLIENT] prefix
        if (fullName.indexOf("[CLIENT]") !== 0) continue;

        // Remove prefix for button label
        var displayName = fullName.replace(/^\[CLIENT\]\s*/, "");

        var btn = document.createElement("button");
        btn.textContent = displayName;

        var icon = scene.attributes.icon;
        if (icon) {
            var iconEl = document.createElement("i");
            iconEl.className = "mdi " + icon.replace("mdi:", "mdi-");
            iconEl.style.marginRight = "0.5em";
            btn.insertBefore(iconEl, btn.firstChild);
        }

        btn.onclick = function (s) {
            return function () { activateScene(s.entity_id); };
        }(scene);

        container.appendChild(btn);
    }
}

function renderScripts(scripts) {
    var clientContainer = document.getElementById("scripts");
    var toggleContainer = document.getElementById("toggles");

    clientContainer.innerHTML = "";
    toggleContainer.innerHTML = "";

    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        var fullName = script.attributes.friendly_name || script.entity_id;
        var targetContainer = null;
        var displayName = fullName;

        // Determine which container to render to
        if (fullName.indexOf("[CLIENT]") === 0) {
            targetContainer = clientContainer;
            displayName = fullName.replace(/^\[CLIENT\]\s*/, "");
        } else if (fullName.indexOf("[TOGGLE]") === 0) {
            targetContainer = toggleContainer;
            displayName = fullName.replace(/^\[TOGGLE\]\s*/, "");
        } else {
            // Skip anything without a recognized prefix
            continue;
        }

        // Create button
        var btn = document.createElement("button");
        btn.textContent = displayName;

        // Optional icon support
        var icon = script.attributes.icon;
        if (icon) {
            var iconEl = document.createElement("i");
            iconEl.className = "mdi " + icon.replace("mdi:", "mdi-");
            iconEl.style.marginRight = "0.5em";
            btn.insertBefore(iconEl, btn.firstChild);
        }

        // Attach handler
        btn.onclick = (function(s) {
            return function() { runScript(s.entity_id); };
        })(script);

        targetContainer.appendChild(btn);
    }
}



function renderGroups(entities) {
    var container = document.getElementById("groups");
    container.innerHTML = "";

    entities.forEach(function (entity) {
        var domain = entity.entity_id.split(".")[0];

        // Only include groups or group-like entities with an entity_id array (but not scenes)
        if ((domain === "group" || Array.isArray(entity.attributes.entity_id)) && domain !== "scene") {

            // Create wrapper div
            var groupDiv = document.createElement("div");
            groupDiv.className = entity.state + " group-row";

            // Toggle button
            var btn = document.createElement("button");
            btn.textContent = (entity.attributes.friendly_name || entity.entity_id);

            btn.onclick = function () {
                var originalState = entity.state;

                // Send the toggle command to HA
                toggleEntity(entity, function () {
                    setTimeout(loadEntities, 1000); // give HA time to update state
                });

                // Optimistically update the state
                entity.state = originalState === "on" ? "off" : "on";

                // Immediately re-render the UI
                renderGroups(entities);
            };


            groupDiv.appendChild(btn);

            if (domain === "light" && entity.attributes.rgb_color) {
                var rgb = entity.attributes.rgb_color;
                var hex = ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2])
                    .toString(16)
                    .slice(1);

                var input = document.createElement("input");
                input.readOnly = true;
                input.value = hex;
                input.setAttribute("data-jscolor", "{closeButton:true}");
                input.setAttribute("data-entity-id", entity.entity_id);
                input.style.marginLeft = "10px";
                input.style.padding = "5px";
                input.style.border = "1px solid #ccc";
                input.style.width = "80px";

                input.addEventListener("change", function () {
                    try {
                        var hexVal = this.value.replace(/^#/, "");
                        var entId = this.getAttribute("data-entity-id");

                        if (!hexVal || hexVal.length !== 6) {
                            log("Invalid hex color:", hexVal);
                            return;
                        }

                        var r = parseInt(hexVal.substring(0, 2), 16);
                        var g = parseInt(hexVal.substring(2, 4), 16);
                        var b = parseInt(hexVal.substring(4, 6), 16);

                        if ([r, g, b].some(isNaN)) {
                            log("Parsed RGB contains NaN", r, g, b);
                            return;
                        }

                        setLightColor(entId, [r, g, b]);
                    } catch (e) {
                        log("Error in color change handler:", e);
                    }
                });

                groupDiv.appendChild(input);

                if (window.jscolor) {
                    new jscolor(input);
                }
            }

            container.appendChild(groupDiv);
        }
    });
}

function renderDevices(devices) {
    var container = document.getElementById("devices-section");
    container.innerHTML = "";

    for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        var domain = device.entity_id.split(".")[0];

        if (Array.isArray(device.attributes.entity_id)) {
            continue;
        }

        if (domain === "light" || domain === "switch") {
            var groupDiv = document.createElement("div");
            groupDiv.className = device.state + " group-row";

            // Toggle Button
            var btn = document.createElement("button");
            btn.textContent = (device.attributes.friendly_name || device.entity_id);

            (function (dev, button) {
                button.onclick = function () {
                    // Save the original state
                    var originalState = dev.state;

                    // Call HA to toggle the state based on the real current state
                    toggleEntity(dev, function () {
                        // Refresh real state from HA after short delay
                        setTimeout(loadEntities, 500);
                    });

                    // Optimistically update the device state locally
                    dev.state = originalState === "on" ? "off" : "on";

                    // Re-render UI immediately
                    renderDevices(devices);
                };
            })(device, btn);


            groupDiv.appendChild(btn);

            // Color Picker (only for RGB-capable lights)
            if (domain === "light" && device.attributes.rgb_color) {
                var rgb = device.attributes.rgb_color;
                var hex = ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2])
                    .toString(16)
                    .slice(1);
                var input = document.createElement("input");
                input.readOnly = true;
                input.value = hex;
                input.setAttribute("data-jscolor", "{closeButton:true}");
                input.setAttribute("data-entity-id", device.entity_id);

                // Add event listener for color changes
                input.addEventListener('change', function () {
                    try {
                        var hexVal = this.value.replace(/^#/, '');
                        var entId = this.getAttribute("data-entity-id");

                        if (!hexVal || hexVal.length !== 6) {
                            log("Invalid hex color:", hexVal);
                            return;
                        }

                        var r = parseInt(hexVal.substring(0, 2), 16);
                        var g = parseInt(hexVal.substring(2, 4), 16);
                        var b = parseInt(hexVal.substring(4, 6), 16);

                        if ([r, g, b].some(isNaN)) {
                            log("Parsed RGB contains NaN", r, g, b);
                            return;
                        }

                        setLightColor(entId, [r, g, b]);
                    } catch (e) {
                        log("Error in color change handler:", e);
                    }
                });


                groupDiv.appendChild(input);

                // Initialize jscolor picker on the input
                if (window.jscolor) {
                    new jscolor(input);
                }
            } else {
                var input = document.createElement("input");
                input.readOnly = true;
                groupDiv.appendChild(input);
            }

            container.appendChild(groupDiv);
        }
    }
}


function setLightColor(entityId, rgbArray) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", SERVER_URL + "/api/services/light/turn_on", true);
    xhr.setRequestHeader("Authorization", "Bearer " + TOKEN);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({
        entity_id: entityId,
        rgb_color: rgbArray
    }));
}

function loadEntities() {
    fetchEntities(function (entities) {
        var nonGroupEntities = entities.filter(function (e) {
            return e.entity_id.indexOf("group.") !== 0;
        });

        renderScenes(filterByDomain(entities, "scene"));
        renderScripts(filterByDomain(entities, "script"));
        renderGroups(entities);
        renderDevices(nonGroupEntities);
    }, function () {
        log("Failed to load entities from Home Assistant");
    });
}


document.addEventListener("DOMContentLoaded", function () {
    loadEntities();
});
