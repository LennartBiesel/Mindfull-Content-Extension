document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();

    document.getElementById('loginButton').addEventListener('click', login);
    document.getElementById('logoutButton').addEventListener('click', logout);
});

document.addEventListener('DOMContentLoaded', function() {
    const workModeToggle = document.getElementById('workModeToggle');

    // Initialize the toggle with the current state from storage
    chrome.storage.local.get(['workMode'], function(result) {
        if(result.workMode === 'ON') {
            workModeToggle.checked = true;
        } else {
            workModeToggle.checked = false;
        }
    });

    // Listen for changes to the toggle and update storage
    workModeToggle.addEventListener('change', function() {
        let workModeState = this.checked ? 'ON' : 'OFF';
        chrome.storage.local.set({ workMode: workModeState }, function() {
            console.log('Work mode set to ' + workModeState);
        });
    });
});

workModeToggle.addEventListener('change', function() {
    let workModeState = this.checked ? 'ON' : 'OFF';
    chrome.storage.local.set({ workMode: workModeState }, function() {
        console.log('Work mode set to ' + workModeState);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {message: "WM_STATE_CHANGED"});
        });
    });
});

document.getElementById('authButton').addEventListener('click', function() {
    const url = 'https://api.notion.com/v1/oauth/authorize?client_id=4207d375-1324-44bc-9081-d631f9dc8951&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fnotion%2Fredirect%2F';
    window.open(url, '_blank');
});

// Checks the status of if a notion account is connected 
function checkNotionStatus() {
    fetchWithToken('http://localhost:8000/api/notion-connection-status/')
        .then(response => response.json())
        .then(data => {
            if (!data.is_connected_to_notion) {
                document.getElementById('authButton').style.display = 'block';
                document.getElementById('addDatabaseButton').style.display = 'none';
            } else if (!data.is_connected_to_notion_database) {
                document.getElementById('authButton').style.display = 'none';
                document.getElementById('addDatabaseButton').style.display = 'block';
            } else {
                document.getElementById('authButton').style.display = 'none';
                document.getElementById('addDatabaseButton').style.display = 'none';
                showOtherFeatures();
            }
        })
        .catch(error => console.error('Error:', error));
}

function showOtherFeatures() {
    // Show other elements of the extension's UI that should be available
    // after the user is fully connected with Notion
    document.getElementById('taskCreation').style.display = 'block';
    fetchUserTasks();
}

// Notion Database Id Button 
document.getElementById('addDatabaseButton').addEventListener('click', function() {
    let databaseLink = prompt("Please enter your Notion Database link:");
    if (databaseLink) {
        // Send this link to your Django backend
        fetchWithToken('http://localhost:8000/api/submit_database_link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ database_link: databaseLink })
        })
        .then(response => {
            if (response.ok) {
                alert("Database link added successfully.");
                // Hide the add database button and show other features
                document.getElementById('addDatabaseButton').style.display = 'none';
                showOtherFeatures();
            } else {
                alert("Failed to add database link. Please try again.");
            }
        })
        .catch(error => console.error('Error:', error));
    }
});


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


function checkAuthentication() {
    chrome.storage.local.get(['accessToken', 'username'], function(result) {
        if (result.accessToken) {
            // User is authenticated
            displayMessage(`Hello, ${result.username}!`);
        } else {
            displayLoginForm();
        }
    });
}

function login() {
    let username = document.getElementById('usernameInput').value;
    let password = document.getElementById('passwordInput').value;

    fetch('http://localhost:8000/api/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.access && data.refresh) {
            chrome.storage.local.set({
                accessToken: data.access,
                refreshToken: data.refresh,
                username: username
            }, function() {
                displayMessage(`Hello, ${username}!`);
            });
        } else {
            console.error('Failed to login.');
        }
    })
    .catch(error => console.error('Error:', error));
}

function logout() {
    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            fetch('http://localhost:8000/api/logout/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${result.accessToken}`
                }
            })
            .then(() => {
                // Clear the token and username from storage
                chrome.storage.local.remove(['accessToken', 'username'], function() {
                    displayLoginForm();
                });
            })
            .catch(error => console.error('Error:', error));
        }
    });
}


document.getElementById('registerButton').addEventListener('click', register);
document.getElementById('registrationToggle').addEventListener('click', function() {
    toggleVisibility('registrationForm', 'loginForm');
});
document.getElementById('loginToggle').addEventListener('click', function() {
    toggleVisibility('loginForm', 'registrationForm');
});

function register() {
    let username = document.getElementById('regUsernameInput').value;
    let email = document.getElementById('regEmailInput').value; // Added this line
    let password = document.getElementById('regPasswordInput').value;

    fetchWithToken('http://localhost:8000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            email: email, // Added this line
            password: password
        })
    })
    .then(response => {
        if (response.status === 201) { // Assuming a successful registration returns a 201 Created status
            displayMessage(`Successfully registered, ${username}! Please login.`);
            toggleVisibility('loginForm', 'registrationForm');
        } else {
            console.error('Failed to register.');
        }
    })
    .catch(error => console.error('Error:', error));
}

function toggleVisibility(showId, hideId) {
    document.getElementById(showId).style.display = 'block';
    document.getElementById(hideId).style.display = 'none';
}

document.getElementById('submitTaskButton').addEventListener('click', submitTask);

function submitTask() {
    let taskName = document.getElementById('taskInput').value;
    
    if(!taskName) {
        alert('Please provide a task name.');
        return;
    }

    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            fetchWithToken('http://localhost:8000/api/create-task/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.accessToken}`
                },
                body: JSON.stringify({
                    taskName: taskName,
                    videosWatched: 0,
                    done: false
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.id) {
                    alert('Task created successfully');
                    document.getElementById('taskInput').value = ''; 
                    fetchUserTasks(); 
                } else {
                    alert('Failed to create task. Please try again.');
                }
            })
            .catch(error => console.error('Error:', error));
        }
    });
}

function fetchUserTasks() {
    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            fetchWithToken('http://localhost:8000/api/user-tasks/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${result.accessToken}`
                }
            })
            .then(response => response.json())
            .then(data => {
                
                populateTasks(data);
            })
            .catch(error => console.error('Error fetching tasks:', error));
        }
    });
}

function populateTasks(tasks) {
    const taskTableBody = document.getElementById('taskTable').querySelector('tbody');

    tasks.sort((a, b) => b.is_current - a.is_current); 
    // Clear current rows
    taskTableBody.innerHTML = '';

    tasks.forEach(task => {
        let row = taskTableBody.insertRow();

        // Task name column
        let taskCell = row.insertCell(0);
        taskCell.textContent = task.taskName;

        // Videos watched column
        let videosCell = row.insertCell(1);
        videosCell.textContent = task.videos_watched;

        // Done column
        let doneCell = row.insertCell(2);
        let checkBox = document.createElement('input');
        checkBox.type = 'checkbox';
        checkBox.checked = task.done;
        checkBox.addEventListener('change', function() {
            updateTaskStatus(task.id, checkBox.checked);
        });
        doneCell.appendChild(checkBox);

        // Set Current column
        let setCurrentCell = row.insertCell(3);
        let setCurrentButton = document.createElement('button');
        setCurrentButton.textContent = "Set Current";
        setCurrentButton.dataset.taskId = task.id; // Assuming 'id' is the identifier for tasks.
        
        setCurrentButton.addEventListener('click', function() {
            setCurrentTask(task.id);
        });

        setCurrentCell.appendChild(setCurrentButton);

        // Check if the task is the current task and color it green
        if (task.is_current) {
            row.classList.add('currentTask');
        };
    });
}

  

function updateTaskStatus(taskId, status) {
    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            fetchWithToken(`http://localhost:8000/api/update_task/${taskId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.accessToken}`
                },
                body: JSON.stringify({
                    done: status
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message !== "Task status updated successfully") {
                    // If the task status didn't update successfully, revert the checkbox
                    alert('Failed to update task status. Please try again.');
                    fetchUserTasks();  // Refresh tasks to revert checkbox
                }
            })
            .catch(error => console.error('Error updating task status:', error));
        }
    });
}

function setCurrentTask(taskId) {
    chrome.storage.local.get(['accessToken'], function(result) {
        if (result.accessToken) {
            fetchWithToken(`http://localhost:8000/api/set_current_task/${taskId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.accessToken}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.message !== "Task set as current successfully") {
                    alert('Failed to set task as current. Please try again.');
                } else {
                    // DOM Manipulation Logic
                    const taskTableBody = document.getElementById('taskTable').querySelector('tbody');
                    // Remove currentTask class from all rows
                    taskTableBody.querySelectorAll('.currentTask').forEach(el => el.classList.remove('currentTask'));
                    
                    // Find the row for this taskId and add the currentTask class
                    const taskRow = taskTableBody.querySelector(`[data-task-id="${taskId}"]`).closest('tr');
                    taskRow.classList.add('currentTask');
                }
                fetchUserTasks();  // Refresh tasks to show current task
            })
            .catch(error => console.error('Error setting task as current:', error));
        }
    });
}




function displayMessage(message) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('userArea').style.display = 'block';
    document.getElementById('taskCreation').style.display = 'none'; // Add this line
    document.getElementById('greeting').innerText = message;

    checkNotionStatus();
    
}

function displayLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('userArea').style.display = 'none';
}

