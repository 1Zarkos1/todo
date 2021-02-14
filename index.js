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
  }</span><span class="add-comment" onclick="addInlineComment(this.closest('.task-container'))"><i class="bi-chat-square-text text-button-icon"></i><i class="bi-plus text-button-icon"></i></span>
                </div>
                    <span class="status-date sm-mg" data-created="${created}">created - ${moment(
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
                    : `<i class="bi-chat-square-text text-button-icon comments-toggle" onclick="toggleCommentSection(this)"></i>`
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
  let options = document.getElementById("status").checked
    ? "&status=active"
    : "";
  let sort = document.getElementById("sort").value;
  let data = await makeRequest(`/tasks/?sort=${sort}${options}`, "GET", true);
  let tasks = data.map((task) => renderTask(task)).join("\n");
  listElem.innerHTML = tasks;
}

async function deleteComment(commentContainer, existing = true) {
  let parent = commentContainer.parentNode;
  let comment_id = commentContainer.dataset.id;
  if (existing) {
    resp = await makeRequest(`/comments/${comment_id}`, "DELETE", false);
    if (!parent.querySelector(".comment-container")) {
      let buttons = parent.parentNode.querySelector(".task-buttons");
      buttons.removeChild(buttons.querySelector(".comments-toggle"));
    }
  }
  !existing || resp ? parent.removeChild(commentContainer) : false;
}

async function deleteTask(taskContainer) {
  let task_id = taskContainer.dataset.id;
  resp = await makeRequest(`/tasks/${task_id}`, "DELETE", false);
  resp ? taskContainer.parentNode.removeChild(taskContainer) : false;
}

async function toggleTaskCompletion(checkbox) {
  let taskContainer = checkbox.closest(".task-container");
  let task_id = taskContainer.dataset.id;
  resp = await makeRequest(`/tasks/${task_id}/complete`, "PUT", true);
  if (resp !== false) {
    let state = resp ? `(completed - ${moment(resp).format("LLL")})` : "";
    checkbox.closest(".task-container").classList.toggle("completed");
    taskContainer.querySelector(".title + .status-date").innerHTML = state;
  } else {
    checkbox.checked = !checkbox.checked;
  }
}

async function editTask(form) {
  event.preventDefault();
  let taskId = form.dataset.id; // way to get task
  sentForm = new FormData(form);
  data = await makeRequest(`/tasks/${taskId}`, "PUT", true, sentForm);
  if (data) {
    if (!data.hasOwnProperty("errors")) {
      let taskObj = getTaskObjFromForm(sentForm, data, taskId);
      let replacedTask = document.getElementById(`task-${taskId}`);
      let newTask = new DOMParser()
        .parseFromString(renderTask(taskObj), "text/html")
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
  sentForm = new FormData(form);
  let data = await makeRequest("/tasks/", "POST", true, sentForm);
  if (data) {
    if (data.hasOwnProperty("task")) {
      let taskObj = getTaskObjFromForm(sentForm, data);
      listElem.innerHTML = renderTask(taskObj) + listElem.innerHTML;
      document
        .getElementById("task-form")
        .replaceWith(cleanForm.cloneNode(true));
    } else {
      showFormValidation(data.errors);
    }
  }
}

function getTaskObjFromForm(form, respIds, existingId = null) {
  let existing =
    existingId &&
    document.querySelector(`.task-container[data-id="${existingId}"]`);
  let now = new Date().toJSON();
  let taskObj = {
    comments: [],
    id: existingId || respIds["task"],
    created: existing?.querySelector("[data-created]").dataset.created || now,
    datetime_completed:
      existing?.querySelector(".task-header .status-date[title]").title || null,
  };
  let id, existingComment, commentObj;
  form.forEach((value, key) => {
    if (key.startsWith("comment-")) {
      id = key.split("-")[1];
      existingComment = existing?.querySelector(
        `.comment-container[data-id="${id}"]`
      );
      commentObj = {
        id: respIds["comments"].shift(),
        created: existingComment?.dataset.created || now,
        text: value,
      };
      taskObj.comments.push(commentObj);
    } else {
      taskObj[key] = value;
    }
  });
  return taskObj;
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
  let fields = parent.querySelectorAll(`.comment-form`);
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
  newForm.dataset.id = editedTask.dataset.id;
  let date = editedTask.querySelector(".datetime-due").parentNode.dataset.date;
  newForm.title.value = decodeHtml(
    editedTask.querySelector(".title").innerHTML
  );
  newForm.datetime_due.value =
    date.length === 19 ? date.slice(0, date.length - 3) : date;
  newForm.description.value = decodeHtml(
    editedTask.querySelector(".description").innerHTML.trim()
  );
  newForm.submit.value = "Edit";
  newForm.getElementsByTagName("legend")[0].innerHTML = "Edit task";
  document.getElementById("task-form").replaceWith(newForm);
  newForm.color.value = rgbToHex(editedTask.style.borderColor);
  let comments = editedTask.querySelectorAll(
    ".comment-list .comment-container"
  );
  for (let comment of comments) {
    let id = comment.dataset.id;
    let text = comment.querySelector(".comment-text").textContent.trim();
    renderCommentForm({ id, text });
  }
}

function renderCommentForm(comment) {
  let fieldset = document.querySelector("#task-form fieldset");
  let lastCommentNumber = +fieldset
    .querySelector(".comment-form:last-of-type label")
    ?.textContent.split("№")[1];
  let number = lastCommentNumber ? lastCommentNumber + 1 : 1;
  let field = `<div class="mb-3 comment-form">
    <label for="comment-">Comment №${number}</label>
    <i class="bi-x text-button-icon sm-icon" style="color: red;" onclick="deleteCommentField(this.parentNode);"></i>
    <input type="text" class="form-control" name="comment-${
      comment?.id || ""
    }" value="${comment?.text || ""}"/>
  </div>`;
  fieldset.append(
    new DOMParser()
      .parseFromString(field, "text/html")
      .querySelector(".comment-form")
  );
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
  input = false,
  secAction = "editComment(this);"
) {
  let commentContainer = `<div class="comment-container" data-id="${
    comment.id
  }" data-created="${comment.created}" data-text="${comment.text}">
<div class="comment-body">
  <span class="comment-header status-date sm-mg">${
    comment.created ? moment(comment.created).format("LLL") : "Add comment:"
  }</span>
  ${
    input
      ? `<input class="form-control" type="text" value="${
          comment.text?.trim() || ""
        }">`
      : `<div class="comment-text">
    ${comment.text}
  </div>`
  }
</div>
<div class="comment-buttons">
  <i class="${buttonsIcons[0]} text-button-icon" onclick="${secAction}"></i>
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

function addInlineComment(taskContainer) {
  let commentList = taskContainer.querySelector(".comment-list");
  if (!commentList) {
    commentList = document.createElement("div");
    commentList.setAttribute("class", "comment-list");
    taskContainer.append(commentList);
  }
  let comment = renderComment(
    {},
    true,
    ["bi-check2-square", "bi-x"],
    "deleteComment(this.closest('.comment-container'), false);",
    true,
    "confirmCommentAdd(this.closest('.comment-container'))"
  );
  commentList.append(comment);
}

async function confirmCommentAdd(commentContainer) {
  let text = commentContainer.querySelector("input").value;
  let data = {
    text,
    taskId: commentContainer.closest(".task-container").dataset.id,
  };
  console.log(data);
  resp = await makeRequest(`/comments/`, "POST", true, JSON.stringify(data));
  if (resp) {
    let newContainer = renderComment(
      {
        id: resp.id,
        created: new Date().toJSON(),
        text,
      },
      true
    );
    commentContainer.replaceWith(newContainer);
    let taskButtons = newContainer
      .closest(".task-container")
      .querySelector(".task-buttons");
    let commentButton = taskButtons.querySelector(".comment-toggle");
    if (!commentButton) {
      commentButton = document.createElement("i");
      commentButton.setAttribute(
        "class",
        "bi-chat-square-text text-button-icon comments-toggle"
      );
      commentButton.setAttribute("onclick", "toggleCommentSection(this)");
      taskButtons.append(commentButton);
    }
  }
}

function decodeHtml(text) {
  let txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}
