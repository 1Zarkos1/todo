function renderTask({
  id,
  title,
  created,
  datetime_due,
  description,
  updated,
  datetime_completed,
  color,
  comments,
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
            <a href="#" onclick="insertFormWithEditingData(this.closest('.task-container'))">edit task</a>
            <div class="comment-list">
                ${comments
                  .map((comment) => {
                    return `<div class="comment-container" data-comment-id=${comment.id}>
                    <div class="comment-text">
                      ${comment.text}
                    </div>
                    <a href="#" className="" onclick="deleteComment(this.parentNode);">
                      delete
                    </a>
                    </div>`;
                  })
                  .join("")}
            </div>
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

async function deleteComment(commentContainer) {
  data = await makeRequest(
    "/delete-comment",
    commentContainer.dataset.commentId
  );
  data ? commentContainer.parentNode.removeChild(commentContainer) : false;
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

function insertFormWithEditingData(editedTask) {
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
  let comments = editedTask.querySelectorAll(
    ".comment-list .comment-container"
  );
  console.log(comments);
  for (let comment of comments) {
    let id = comment.dataset.commentId;
    console.log(id);
    let text = comment.querySelector(".comment-text").textContent.trim();
    addCommentField(text, id);
  }
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
  if (!data.hasOwnProperty("errors")) {
    console.log(data);
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
function addCommentField(value = "", id) {
  event.preventDefault();
  let form = document.getElementById("task-form");
  let commentNumber = 1;
  while (form.querySelector(`div#comment-group-${commentNumber}`)) {
    commentNumber += 1;
  }
  let div = document.createElement("div");
  div.setAttribute("class", "mb-3");
  div.setAttribute("id", `comment-group-${commentNumber}`);
  if (id) {
    let hidden = document.createElement("input");
    hidden.setAttribute("type", "hidden");
    hidden.setAttribute("name", `hidden-${commentNumber}`);
    hidden.value = id;
    div.append(hidden);
  }
  let label = document.createElement("label");
  label.innerHTML = `Comment №${commentNumber}`;
  label.setAttribute("for", `comment-${commentNumber}`);
  let deleteBtn = document.createElement("a");
  deleteBtn.textContent = "delete";
  deleteBtn.addEventListener("click", () => deleteCommentField(div));
  deleteBtn.setAttribute("href", "#");
  let comment = document.createElement("input");
  comment.setAttribute("type", "text");
  comment.setAttribute("id", `comment-${commentNumber}`);
  comment.setAttribute("name", `comment-${commentNumber}`);
  comment.value = value;
  comment.setAttribute("class", "form-control");
  div.append(label);
  div.append(deleteBtn);
  div.append(comment);
  form.querySelector("fieldset.form-group").append(div);
}

function deleteCommentField(commentFieldGroup) {
  event.preventDefault();
  let id = +commentFieldGroup.id.split("-")[2];
  let parent = commentFieldGroup.parentNode;
  parent.removeChild(commentFieldGroup);
  reiterateFields(parent, id);
}

function reiterateFields(container, id) {
  console.log("some");
  let fields = container.querySelectorAll(`div[id*=comment-group]`);
  for (field of fields) {
    let fieldId = field.id.split("-")[2];
    if (fieldId >= id) {
      field.id = `comment-group-${id}`;
      field.querySelector("label").innerHTML = `Comment №${id}`;
      let hidden = field.querySelector(`input[type=hidden]`);
      hidden !== null ? (hidden.name = `hidden-${id}`) : false;
      field.querySelector("input[type=text]").id = `comment-${id}`;
      field.querySelector("input[type=text]").name = `comment-${id}`;
      id += 1;
    }
  }
}
