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
                  ${comments.map((comment) => renderComment(comment)).join("")}
              </div>`
            }
          </div>`;
}

async function makeRequest(url, method, isValueReturned, data) {
  try {
    let response = await fetch(url, {
      method: method,
      body: data,
    });
    if (response.ok) {
      return isValueReturned ? await response.json() : true;
    } else {
      throw new Error(`Server error: ${await response.json()["error"]}`);
    }
  } catch (error) {
    alert(error); // change to popup
    return false;
  }
}

async function populateTasks() {
  let data = await makeRequest("/tasks/", "GET", true);
  let tasks = data.map((task) => renderTask(task)).join("\n");
  listElem.innerHTML = tasks;
}

async function deleteComment(commentContainer) {
  let comment_id = commentContainer.dataset.commentId;
  resp = await makeRequest(`/comments/${comment_id}`, "DELETE", false);
  resp ? commentContainer.parentNode.removeChild(commentContainer) : false;
}

async function deleteTask(taskContainer) {
  let task_id = taskContainer.dataset.id;
  resp = await makeRequest(`/tasks/${task_id}`, "DELETE", false);
  resp ? taskContainer.parentNode.removeChild(taskContainer) : false;
}

async function toggleTaskCompletion(checkbox) {
  let taskContainer = checkbox.closest(".task-container");
  let task_id = taskContainer.dataset.id;
  resp = await makeRequest(`/tasks/${task_id}/complete`, "PUT", false);
  if (resp) {
    let state = resp ? `(completed - ${moment(respData).format("LLL")})` : "";
    checkbox.closest(".task-container").classList.toggle("completed");
    taskContainer.querySelector(".title + .status-date").innerHTML = state;
  } else {
    checkbox.checked = !checkbox.checked;
  }
}

async function editTask(form) {
  event.preventDefault();
  form = new FormData(form);
  let taskId; // way to get task
  postId = await makeRequest(`/tasks/${taskId}`, "PUT", false, form);
  if (postId) {
    if (!postId.hasOwnProperty("errors")) {
      // populate task with data from form and id
      let replacedTask = document.getElementById(`task-${data.id}`);
      let newTask = new DOMParser()
        .parseFromString(renderTask(data), "text/html")
        .getElementById(`task-${taskId}`);
      replacedTask.replaceWith(newTask);
      form.replaceWith(cleanForm.cloneNode(true));
    } else {
      showFormValidation(data.errors);
    }
  }
}

async function addTask(form) {
  event.preventDefault();
  form = new FormData(form);
  let postId = await makeRequest("/tasks/", "POST", true, form);
  if (postId) {
    if (postId.hasOwnProperty("id")) {
      // populate task with data from form and id
      listElem.innerHTML = renderTask(data) + listElem.innerHTML;
      document
        .getElementById("task-form")
        .replaceWith(cleanForm.cloneNode(true));
    } else {
      showFormValidation(data.errors);
    }
  }
}

function showFormValidation(errors) {
  for (let field of Object.keys(errors)) {
    let errorField = document.getElementById(`${field}-validation`);
    document.getElementById(`${field}`).classList.add("is-invalid");
    errorField.classList.add("invalid-feedback");
    errorField.innerHTML = "";
    for (let error of errors[field]) {
      errorField += `${error}\n`;
    }
  }
}

function resetForm() {
  document.getElementById("task-form").replaceWith(cleanForm.cloneNode(true));
}

function deleteCommentField(commentFieldGroup) {
  let parent = commentFieldGroup.parentNode;
  parent.removeChild(commentFieldGroup);
  let fields = container.querySelectorAll(`div[id*=comment-group]`);
  let commentNumber = 1;
  for (field of fields) {
    field.querySelector("label").innerHTML = `Comment №${commentNumber}`;
    commentNumber += 1;
  }
}

function toggleCommentSection(toggleBtn) {
  let commentSection = toggleBtn
    .closest(".task-container")
    .querySelector(".comment-list");
  commentSection.style.display = commentSection.style.display ? "" : "none";
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

async function editComment(elem) {
  let commentContainer = elem.closest(".comment-container");
  let id = commentContainer.dataset.id;
  let input = commentContainer.querySelector("input");
  if (input) {
    resp = await makeRequest(`/comments/${id}`, "PUT", false, input.value);
    if (resp) {
      let newContainer = renderComment(
        {
          ...commentContainer.dataset,
          text: input.value,
        },
        true
      );
      commentContainer.replaceWith(newContainer);
    }
  } else {
    let buttons = ["bi-check2-square", "bi-arrow-return-left"];
    let action = "cancelCommentEditing(this);";
    let newContainer = renderComment(
      commentContainer.dataset,
      true,
      buttons,
      action,
      true
    );
    commentContainer.replaceWith(newContainer);
  }
}

function cancelCommentEditing(elem) {
  let container = elem.closest(".comment-container");
  let newContainer = renderComment(container.dataset, true);
  container.replaceWith(newContainer);
}

function renderComment(
  comment,
  asDOMElement = false,
  buttonsIcons = ["bi-pencil-square", "bi-x"],
  action = "deleteComment(this.closest('.comment-container'));",
  input = false
) {
  let commentContainer = `<div class="comment-container" data-id="${
    comment.id
  }" data-created="${comment.created}" data-text="${comment.text}">
<div class="comment-body">
  <span class="comment-header status-date sm-mg">${moment(
    comment.created
  ).format("LLL")}</span>
  ${
    input
      ? `<input class="form-control" type="text" value="${comment.text.trim()}">`
      : `<div class="comment-text">
    ${comment.text}
  </div>`
  }
</div>
<div class="comment-buttons">
  <i class="${
    buttonsIcons[0]
  } text-button-icon" onclick="editComment(this);"></i>
  <i class="${
    buttonsIcons[1]
  } text-button-icon" onclick="${action}" style="color: red;"></i>
</div>
</div>`;
  if (asDOMElement) {
    return new DOMParser()
      .parseFromString(commentContainer, "text/html")
      .querySelector(".comment-container");
  }
  return commentContainer;
}
