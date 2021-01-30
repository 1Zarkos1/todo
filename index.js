function renderTask({
  id,
  title,
  created,
  datetime_due,
  description,
  updated,
  datetime_completed,
  color,
}) {
  console.log(datetime_completed);
  return `<div id="task-${id}" class="task-container" data-id=${id} style="${
    color ? `border: 2px solid ${color}` : ""
  }">
            <div class="task-header">
                <span class='completion'>
                  <input type="checkbox" id="check" onclick="toggleTaskCompletion(this)" ${
                    datetime_completed ? "checked" : ""
                  }>
                </span>
                <span class='title'>${title}</span>
                <span class="completion-date">${
                  datetime_completed ? "completed" : "in progress"
                }</span>
                <span>created at ${created}</span>
                <span>due at <span class="datetime-due">${datetime_due}</span></span>
            </div>
            <div>updated at ${updated}</div>
            <div class="description">
                ${description}
            </div>
            <a href="#" onclick="deleteTask(this.closest('.task-container'))">delete task</a>
            <a href="#" onclick="insertFormWithEditedData(this.closest('.task-container'))">edit task</a>
        </div>`;
}

async function makeRequest(url, data) {
  let method = url === "/get-tasks" ? "get" : "post";
  try {
    let response = await fetch(
      url,
      {
        method: method,
        body: data,
      },
      false
    );
    let responseData = await response.json();
    console.log(responseData);
    return responseData;
  } catch (error) {
    console.log(error);
  }
}

async function toggleTaskCompletion(checkbox) {
  let taskContainer = checkbox.closest(".task-container");
  respData = await makeRequest(
    "/toggle-task-completion",
    taskContainer.dataset.id
  );
  if (respData && respData.hasOwnProperty("error")) {
    checkbox.checked = !checkbox.checked;
  } else {
    let state = respData ? "completed" : "in progress";
    taskContainer.querySelector(".completion-date").innerHTML = state;
  }
}

function populateTasks(data) {
  let tasks = data.map((task) => renderTask(task)).join("\n");
  listElem.innerHTML = tasks;
}

function insertFormWithEditedData(editedTask) {
  let newForm = cleanForm.cloneNode(true);
  newForm.setAttribute("onsubmit", "editTask(this)");
  newForm.id.value = editedTask.dataset.id;
  let date = new Date(editedTask.querySelector(".datetime-due").innerHTML)
    .toISOString()
    .slice(0, -8);
  newForm.title.value = editedTask.querySelector(".title").innerHTML;
  newForm.datetime_due.value = date;
  newForm.description.value = editedTask
    .querySelector(".description")
    .innerHTML.trim();
  newForm.submit.value = "Edit";
  newForm.getElementsByTagName("legend")[0].innerHTML = "Edit task";
  document.getElementById("task-form").replaceWith(newForm);
}

async function editTask(form) {
  event.preventDefault();
  data = await makeRequest("/edit-task", new FormData(form));
  if (!data.hasOwnProperty("errors")) {
    let replaced = document.getElementById(`task-${data.id}`);
    let newTask = new DOMParser()
      .parseFromString(renderTask(data), "text/html")
      .getElementById(`task-${data.id}`);
    replaced.replaceWith(newTask);
    form.replaceWith(cleanForm.cloneNode(true));
  }
}

async function deleteTask(taskContainer) {
  data = await makeRequest("/delete-task", taskContainer.dataset.id);
  data ? taskContainer.parentNode.removeChild(taskContainer) : false;
}

async function addTask(form) {
  event.preventDefault();
  form = new FormData(form);
  data = await makeRequest("/add-task", form);
  console.log(data);
  if (!data.hasOwnProperty("errors")) {
    listElem.innerHTML = renderTask(data) + listElem.innerHTML;
    document.getElementById("task-form").replaceWith(cleanForm.cloneNode(true));
  } else {
    showValidation(data.errors);
  }
}

function showValidation(errors) {
  for (let field of Object.keys(errors)) {
    let errorField = document.getElementById(`${field}-validation`);
    document.getElementById(`${field}`).classList.add("is-invalid");
    errorField.classList.add("invalid-feedback");
    errorField.innerHTML = "";
    for (let error of errors[field]) {
      errorField.append(`${error}\n`);
    }
  }
}

function resetForm() {
  document.getElementById("task-form").replaceWith(cleanForm.cloneNode(true));
}

async function fillTasks() {
  let data = await makeRequest("/get-tasks");
  populateTasks(data);
}
