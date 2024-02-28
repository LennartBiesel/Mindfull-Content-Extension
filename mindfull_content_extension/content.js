let currentTask = null;
let lastURL = window.location.href;

function hasURLChanged() {
    if (lastURL !== window.location.href) {
        lastURL = window.location.href;
        return true;
    }
    return false;
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.message === "WM_STATE_CHANGED") {
        onVideoPage();
    }
});

function onVideoPage() {
    chrome.storage.local.get(['workMode'], function(result) {
        if(result.workMode === 'ON') {
            let video = document.querySelector("video");
            if (video) {
                video.pause();
                fetchCurrentTask();
            }
        }
    });
}


function handleDomChanges(mutationsList, observer) {
    if (window.location.pathname === "/watch" && hasURLChanged()) {
        onVideoPage();
    }
}

function fetchWithToken(url, options = {}) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], function(tokens) {
            if (!tokens.accessToken) {
                reject('No access token found.');
                return;
            }

            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${tokens.accessToken}`;

            fetch(url, options)
                .then(response => {
                    // If token has expired or is invalid
                    if (response.status === 401) {
                        // Attempt to refresh token
                        refreshAccessToken(tokens.refreshToken)
                            .then(newAccessToken => {
                                // Update the Authorization header with new access token
                                options.headers['Authorization'] = `Bearer ${newAccessToken}`;

                                return fetch(url, options);
                            })
                            .then(resolve)
                            .catch(reject);
                    } else {
                        resolve(response);
                    }
                })
                .catch(reject);
        });
    });
}

function refreshAccessToken(refreshToken) {
    return new Promise((resolve, reject) => {
        fetch('http://localhost:8000/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.access) {
                // Save new access token
                chrome.storage.local.set({ accessToken: data.access }, function() {
                    resolve(data.access);
                });
            } else {
                reject('Failed to refresh access token.');
            }
        })
        .catch(error => {
            console.error('Error refreshing token:', error);
            reject(error);
        });
    });
}


async function fetchCurrentTask() {
    try {
        let result = await chrome.storage.local.get(['accessToken']);
        if (result.accessToken) {
            let response = await fetchWithToken('http://localhost:8000/api/current_task/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${result.accessToken}`
                }
            });

            let data = await response.json();

            if (data && data.taskName) {
                currentTask = data.taskName;
                promptForTask();
            } else {
                alert("Please set a task first.");
                window.location.href = "https://google.com";
            }
        }
    } catch (error) {
        console.error('Error fetching current task:', error);
    }
}

function injectStyles() {
    let styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.type = "text/css";
    styleLink.href = chrome.runtime.getURL("styles.css");
    (document.head || document.documentElement).appendChild(styleLink);
}

function createFloatingPanel() {
    let panel = document.createElement('div');
    panel.id = "floatingPanel";
    panel.style.width = "500px";
    panel.style.height = "500px";
    panel.style.background = "white";
    panel.style.border = "1px solid #E1E1E1";
    panel.style.position = "fixed";
    panel.style.top = "10%";
    panel.style.right = "5%";
    panel.style.zIndex = "9999";
    panel.style.borderRadius = "8px";
    panel.style.overflow = "hidden";
    panel.style.boxShadow = "0px 2px 10px rgba(0, 0, 0, 0.1)";

    let header = document.createElement('div');
    header.id = "floatingPanelHeader";
    header.style.padding = "10px";
    header.style.cursor = "move";
    header.style.background = "#E1E1E1";
    header.style.fontWeight = "bold";
    header.style.fontSize = "16px";
    header.style.color = "#333";
    header.textContent = "Notes Panel";
    panel.appendChild(header);

    let textarea = document.createElement('textarea');
    textarea.id = "videoNotes";
    textarea.style.width = "calc(100% - 20px)";
    textarea.style.height = "calc(100% - 110px)";
    textarea.style.padding = "10px";
    textarea.style.border = "none";
    textarea.style.background = "#F7F7F7";
    textarea.style.color = "#333";
    textarea.style.fontSize = "14px";
    textarea.style.fontFamily = "'Arial', sans-serif";
    textarea.style.resize = "none";
    textarea.placeholder = `Summary: \n\nMain Takeaway: \n\nPersonal Connection: \n\nQuestions & Curiosity: \n\nNext Steps: \n\nTask Alignment: `;
    panel.appendChild(textarea);

    let saveButton = document.createElement('button');
    saveButton.id = "saveNotes";
    saveButton.textContent = "Save Notes";
    saveButton.style.display = "block";
    saveButton.style.margin = "10px auto";
    saveButton.style.padding = "8px 15px";
    saveButton.style.background = "#0179FF";
    saveButton.style.color = "white";
    saveButton.style.border = "none";
    saveButton.style.borderRadius = "4px";
    saveButton.style.cursor = "pointer";
    saveButton.onclick = saveNotes;
    panel.appendChild(saveButton);
    
    document.body.appendChild(panel);
}

function addPanelBehaviors() {
    let panel = document.getElementById("floatingPanel");
    let header = document.getElementById("floatingPanelHeader");

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Get the initial cursor position:
        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        
        // Calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Set the element's new position:
        panel.style.top = (panel.offsetTop - pos2) + "px";
        panel.style.left = (panel.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // Stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}




function saveNotes() {
    let notes = document.getElementById('videoNotes').value;
    let videoURL = window.location.href;

    if (!notes) {
        alert('Please write some notes before saving.');
        return;
    }

    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            let requestData = {
                link: videoURL,
                notes: notes,
                taskName: currentTask
            };

            fetchWithToken('http://localhost:8000/api/save_video_notes/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.accessToken}`
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    // Hide the panel after successfully saving notes
                    let panel = document.getElementById("floatingPanel");
                    if(panel) {
                        panel.remove();
                    };
                } else if (data.error) {
                    alert(data.error);
                }
            })
            .catch(error => {
                console.error('Error saving notes:', error);
            });
        } else {
            alert("Couldn't retrieve the authentication token.");
        }
    });
}

(function(history) {
    const pushState = history.pushState;
    history.pushState = function(state) {
        if (typeof history.onpushstate == "function") {
            history.onpushstate({ state: state });
        }
        // Continue the default behavior
        return pushState.apply(history, arguments);
    };
})(window.history);


window.onpopstate = history.onpushstate = function(event) {
    if (window.location.pathname === "/watch") {
        setTimeout(onVideoPage, 1000); // Adjust the delay if necessary
    }
};



function promptForTask() {
    let relevance = confirm(`Is the video relevant to your task: ${currentTask}?`);
    if (!relevance) {
        window.location.href = "https://google.com";
    } else {
        injectStyles();
        createFloatingPanel();    // Initialize the floating panel
        addPanelBehaviors();      // Add drag and other behaviors to the panel
    }
}

if (window.location.hostname === "www.youtube.com" && window.location.pathname === "/watch") {
    onVideoPage();
}

if (window.location.hostname === "www.youtube.com" && window.location.pathname === "/") {
    document.addEventListener('click', function(event) {
        if (event.target.closest('ytd-rich-item-renderer')) {
            // Detected a video click. Delay check to allow URL update.
            setTimeout(() => {
                if (window.location.pathname === "/watch") {
                    onVideoPage();
                }
            }, 1000);  // Adjust the delay if necessary
        }
    });
}



if (window.location.hostname === "www.youtube.com") {
    let targetNode = document.body;
    let config = { attributes: false, childList: true, subtree: true };

    let observer = new MutationObserver(handleDomChanges);
    observer.observe(targetNode, config);
}


setInterval(() => {
    if (window.location.href !== lastURL) {
        lastURL = window.location.href;
        if (window.location.hostname === "www.youtube.com" && window.location.pathname === "/watch") {
            onVideoPage();
        }
    }
}, 500);