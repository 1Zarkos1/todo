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
  console.log(`"${datetime_due}"`);
  console.log(updated);
  let completed = "";
  if (datetime_completed) {
    completed = "completed";
  } else {
    if (new Date() > new Date(datetime_due)) {
      completed = "failed";
    }
  }
  return `<div id="task-${id}" class="task-container ${completed}" data-id=${id} style="${
    color ? `border: 2px solid ${color}` : ""
  }">
            <div class="task-main">
              <div class='task-completion'>
                <input type="checkbox" class="regular-checkbox" id="check" onclick="toggleTaskCompletion(this)" ${
                  datetime_completed ? "checked" : ""
                } ${completed === "failed" ? "disabled" : ""}>
              </div>
              <div class="task-body">
                <div class="task-header">
                    <span class='title'>${title}</span>
                    <span class="status-date" title="${
                      datetime_completed || ""
                    }">${
    datetime_completed
      ? `(completed - ${moment(datetime_completed).format("LLL")})`
      : ""
  }</span>
                </div>
                    <span class="status-date sm-mg" >created - ${moment(
                      created
                    ).format("LLL")}</span> | 
                    <span class="status-date sm-mg" title='${moment(
                      datetime_due
                    ).format(
                      "LLL"
                    )}' data-date="${datetime_due}">due <span class="datetime-due">${moment(
    datetime_due
  ).fromNow()}</span></span>
                ${
                  updated
                    ? `<div class="status-date sm-mg">updated - ${moment(
                        updated
                      ).format("LLL")}</div>`
                    : ""
                }
                <div class="description">
                    ${description}
                </div>
            </div>
              <div class="task-buttons">
                <i class="bi-pencil-square text-button-icon" onclick="insertFormWithEditingData(this.closest('.task-container'))"></i>
                <i class="bi-x text-button-icon" onclick="deleteTask(this.closest('.task-container'))" style="color: red;"></i>
                ${
                  comments.length === 0
                    ? ""
                    : `<div class="comments-toggle">
                    <i class="bi-chat-square-text text-button-icon" onclick="toggleCommentSection(this)"></i>
                    </div>`
                }
              </div>
            </div>
            ${
              comments.length === 0
                ? ""
                : `
                <div class="comment-list" style="display: None;">
                  ${comments
                    .map((comment) => {
                      return `<div class="comment-container" data-comment-id=${
                        comment.id
                      }>
                      <div class="comment-body">
                        <span class="comment-header status-date sm-mg">${moment(
                          comment.created
                        ).format("LLL")}</span>
                        <div class="comment-text">
                          ${comment.text}
                        </div>
                      </div>
                      <div class="comment-buttons">
                        <i class="bi-pencil-square text-button-icon" onclick="editComment(this);"></i>
                        <i class="bi-x text-button-icon" onclick="deleteComment(this.closest('.comment-container'));" style="color: red;"></i>
                      </div>
                      </div>`;
                    })
                    .join("")}
              </div>
              `
            }
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
  console.log(commentContainer.dataset.commentId);
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
    let state = respData
      ? `(completed - ${moment(respData).format("LLL")})`
      : "";
    checkbox.closest(".task-container").classList.toggle("completed");
    taskContainer.querySelector(".title + .status-date").innerHTML = state;
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
  let date = editedTask.querySelector(".datetime-due").parentNode.dataset.date;
  newForm.title.value = unescape(editedTask.querySelector(".title").innerHTML);
  newForm.datetime_due.value = date.slice(0, date.length - 3);
  newForm.description.value = unescape(
    editedTask.querySelector(".description").innerHTML.trim()
  );
  newForm.submit.value = "Edit";
  newForm.getElementsByTagName("legend")[0].innerHTML = "Edit task";
  document.getElementById("task-form").replaceWith(newForm);
  let comments = editedTask.querySelectorAll(
    ".comment-list .comment-container"
  );
  console.log(comments);
  newForm.color.value = rgbToHex(editedTask.style.borderColor);
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
  // event.preventDefault();
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
  let deleteBtn = document.createElement("i");
  deleteBtn.setAttribute("onclick", "deleteCommentField(this.parentNode)");
  deleteBtn.classList.add("bi-x", "text-button-icon", "sm-icon");
  deleteBtn.style.color = "red";
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

function toggleCommentSection(toggleBtn) {
  let commentSection = toggleBtn
    .closest(".task-container")
    .querySelector(".comment-list");
  console.log(commentSection.style.display);
  if (commentSection.style.display === "none") {
    commentSection.style.display = "";
  } else {
    commentSection.style.display = "None";
  }
}

function rgbToHex(rgbString) {
  return (
    "#" +
    rgbString
      .slice(4, rgbString.length - 1)
      .split(", ")
      .map((number) => {
        let hex = Number.parseInt(number).toString(16);
        return hex.length === 2 ? hex : "0" + hex;
      })
      .join("")
  );
}

async function editComment(elem) {
  event.preventDefault();
  let commentContainer = elem.closest(".comment-container");
  let input = commentContainer.querySelector("input");
  if (input) {
    resp = await makeRequest(
      "/edit-comment",
      JSON.stringify({
        id: commentContainer.dataset.commentId,
        value: input.value,
      })
    );
    if (resp.success) {
      let div = commentContainer.querySelector(".comment-text");
      div.textContent = input.value;
      div.style = "";
      elem.classList.remove("bi-check2-square");
      elem.classList.add("bi-pencil-square");
      let delBtn = elem.parentNode.querySelector("i ~ i");
      delBtn.classList.remove("bi-arrow-return-left");
      delBtn.classList.add("bi-x");
      delBtn.setAttribute("onclick", "cancelCommentEditing(this);");
      input.remove();
    }
  } else {
    let comment = elem
      .closest(".comment-container")
      .querySelector(".comment-text");
    comment.style.display = "None";
    input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("class", "form-control");
    comment.parentNode.insertBefore(input, comment);
    elem.classList.remove("bi-pencil-square");
    elem.classList.add("bi-check2-square");
    let cancel = elem.parentNode.querySelector("i ~ i");
    cancel.classList.remove("bi-x");
    cancel.classList.add("bi-arrow-return-left");
    cancel.setAttribute(
      "onclick",
      "deleteComment(this.closest('.comment-container'));"
    );
    input.value = comment.textContent.trim();
    elem.parentNode.insertBefore(cancel, elem.nextSibling);
  }
}

function cancelCommentEditing(elem) {
  elem.closest(".comment-container").querySelector("input").remove();
  elem.closest(".comment-container").querySelector(".comment-text").style = "";
  elem.classList.remove("bi-arrow-return-left");
  elem.classList.add("bi-x");
  let edit = elem.parentNode.querySelector("i");
  edit.classList.remove("bi-check2-square");
  edit.classList.add("bi-pencil-square");
  elem.setAttribute(
    "onclick",
    "deleteComment(this.closest('.comment-container'));"
  );
}
