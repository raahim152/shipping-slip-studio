const form = document.getElementById("shippingForm");

const nameInput = document.getElementById("customerName");
const addressInput = document.getElementById("customerAddress");
const postalInput = document.getElementById("postalCode");
const phoneInput = document.getElementById("customerPhone");
const codAmountInput = document.getElementById("codAmount");

const codAmountField = document.getElementById("codAmountField");
const preview = document.getElementById("labelPreview");

const queueList = document.getElementById("queueList");
const queueEmpty = document.getElementById("queueEmpty");
const queueCount = document.getElementById("queueCount");

const printArea = document.getElementById("printArea");
const orientationSelect = document.getElementById("pageOrientation");

const printPreviewButton = document.getElementById("printPreviewButton");
const printQueueButton = document.getElementById("printQueueButton");
const clearQueueButton = document.getElementById("clearQueueButton");

let slips = [];

function getCssInches(variableName) {
  return parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
  );
}

function getPaymentStatus() {
  return document.querySelector(
    'input[name="paymentStatus"]:checked'
  ).value;
}

function formatPKR(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-PK");
}

function getCurrentFormData() {
  return {
    name: nameInput.value.trim(),
    address: addressInput.value.trim(),
    postal: postalInput.value.trim(),
    phone: phoneInput.value.trim(),
    payment: getPaymentStatus(),
    amount: codAmountInput.value.trim()
  };
}

function updatePaymentField() {
  const isCOD = getPaymentStatus() === "COD";

  codAmountField.hidden = !isCOD;
  codAmountInput.required = isCOD;

  updatePreview();
}

function createLabel(data) {
  const label = document.createElement("div");
  label.className = "shipping-label";

  const to = document.createElement("div");
  to.className = "label-to";
  to.textContent = "TO";

  const name = document.createElement("div");
  name.className = "label-name";
  name.textContent = data.name || "Customer name";

  const address = document.createElement("div");
  address.className = "label-address";
  address.textContent = data.address || "Delivery address";

  const postal = document.createElement("div");
  postal.className = "label-postal";
  postal.textContent = data.postal ? "Postal code: " + data.postal : "";
  postal.hidden = !data.postal;

  const phone = document.createElement("div");
  phone.className = "label-phone";
  phone.textContent = data.phone || "Phone number";

  const payment = document.createElement("div");
  payment.className = "label-payment";

  if (data.payment === "COD") {
    payment.classList.add("cod");
    payment.textContent = "COD: " + formatPKR(data.amount || 0);
  } else {
    payment.classList.add("paid");
    payment.textContent = "PAID";
  }

  label.append(to, name, address, postal, phone, payment);

  return label;
}

function updatePreview() {
  const data = getCurrentFormData();
  const newLabel = createLabel(data);

  preview.replaceWith(newLabel);
  newLabel.id = "labelPreview";

  // Keep the preview class so the preview styling remains applied.
  newLabel.classList.add("preview-label");
}

function addSlip(data) {
  slips.push({
    ...data,
    id: Date.now() + Math.random()
  });

  renderQueue();
}

function renderQueue() {
  queueList.innerHTML = "";

  slips.forEach((slip, index) => {
    const item = document.createElement("div");
    item.className = "queue-item";

    const details = document.createElement("div");

    const customer = document.createElement("strong");
    customer.textContent = slip.name;

    const payment = document.createElement("small");
    payment.textContent = slip.payment === "COD"
      ? "COD · " + formatPKR(slip.amount)
      : "PAID";

    details.append(customer, payment);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      slips.splice(index, 1);
      renderQueue();
    });

    item.append(details, removeButton);
    queueList.appendChild(item);
  });

  queueCount.textContent = slips.length +
    (slips.length === 1 ? " slip" : " slips");

  queueEmpty.hidden = slips.length > 0;
  printQueueButton.disabled = slips.length === 0;
  clearQueueButton.disabled = slips.length === 0;
}

function getPageDimensions() {
  const orientation = orientationSelect.value;

  if (orientation === "portrait") {
    return {
      width: 8.27,
      height: 11.69,
      usableHeight: 10.99,
      usableWidth: 7.57
    };
  }

  return {
    width: 11.69,
    height: 8.27,
    usableHeight: 7.57,
    usableWidth: 10.99
  };
}

function createPrintSheet(dimensions) {
  const sheet = document.createElement("div");
  sheet.className = "print-sheet";

  // A4 dimensions minus 0.35 inch margins on each side.
  sheet.style.setProperty(
    "--print-height",
    dimensions.Height + "in"
  );

  sheet.style.width = "100%";

  return sheet;
}

function buildPrintSheets(dataList) {
  printArea.innerHTML = "";

  const dimensions = getPageDimensions();
  const sheets = [];

  let currentSheet = createPrintSheet(dimensions);
  let usedHeight = 0;

  // Temporary measuring area lets us measure each label at its
  // actual print width before deciding which page it belongs on.
  const measureArea = document.createElement("div");

  measureArea.style.position = "absolute";
  measureArea.style.left = "-20000px";
  measureArea.style.top = "0";
  measureArea.style.width = dimensions.usableWidth + "in";
  measureArea.style.visibility = "hidden";

  document.body.appendChild(measureArea);

  const gap = 0.12;

  dataList.forEach((data) => {
    const label = createLabel(data);

    label.style.width = Math.min(
      dimensions.usableWidth,
      getCssInches("--label-max-width")
    ) + "in";

    measureArea.appendChild(label);

    const measuredHeight =
      label.getBoundingClientRect().height / 96;

    measureArea.removeChild(label);

    const labelHeight = Math.min(
       Math.max(measuredHeight, getCssInches("--label-min-height")),
       getCssInches("--label-max-height")
    );

    const requiredHeight = labelHeight +
      (currentSheet.children.length > 0 ? gap : 0);

    if (
      currentSheet.children.length > 0 &&
      usedHeight + requiredHeight > dimensions.usableHeight
    ) {
      sheets.push(currentSheet);
      currentSheet = createPrintSheet(dimensions);
      usedHeight = 0;
    }

    const printLabel = createLabel(data);
    printLabel.style.width = Math.min(
      dimensions.usableWidth,
      getCssInches("--label-max-width")
    ) + "in";

    currentSheet.appendChild(printLabel);

    usedHeight += labelHeight +
      (currentSheet.children.length > 1 ? gap : 0);
  });

  if (currentSheet.children.length > 0) {
    sheets.push(currentSheet);
  }

  measureArea.remove();

  sheets.forEach((sheet) => {
    printArea.appendChild(sheet);
  });

  return sheets.length;
}

function printSlips(dataList) {
  if (!dataList.length) {
    alert("There are no slips to print.");
    return;
  }

  const pageCount = buildPrintSheets(dataList);

  const orientation = orientationSelect.value;

  const oldStyle = document.getElementById("dynamicPrintStyle");
  if (oldStyle) {
    oldStyle.remove();
  }

  const printStyle = document.createElement("style");
  printStyle.id = "dynamicPrintStyle";
  printStyle.textContent = `
    @media print {
      @page {
        size: A4 ${orientation};
        margin: 0;
      }
    }
  `;

  document.head.appendChild(printStyle);

  // Allow the browser to finish laying out the print sheets.
  requestAnimationFrame(() => {
    window.print();

    console.log("Prepared " + pageCount + " A4 page(s).");
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = getCurrentFormData();

  if (!data.name || !data.address || !data.phone) {
    alert("Please complete the name, address and phone number.");
    return;
  }

  if (data.payment === "COD") {
    if (data.amount === "" || Number(data.amount) < 0) {
      alert("Please enter a valid COD amount.");
      codAmountInput.focus();
      return;
    }
  }

  addSlip(data);

  // Clear the form ready for the next customer.
  form.reset();
  document.querySelector(
    'input[name="paymentStatus"][value="PAID"]'
  ).checked = true;

  codAmountField.hidden = true;
  codAmountInput.required = false;

  updatePreview();
  nameInput.focus();
});

document.querySelectorAll(
  'input[name="paymentStatus"]'
).forEach((radio) => {
  radio.addEventListener("change", updatePaymentField);
});

[
  nameInput,
  addressInput,
  postalInput,
  phoneInput,
  codAmountInput
].forEach((input) => {
  input.addEventListener("input", updatePreview);
});

printPreviewButton.addEventListener("click", () => {
  const data = getCurrentFormData();

  if (!data.name || !data.address || !data.phone) {
    alert("Enter the customer name, address and phone number first.");
    return;
  }

  if (
    data.payment === "COD" &&
    (data.amount === "" || Number(data.amount) < 0)
  ) {
    alert("Please enter a valid COD amount.");
    return;
  }

  printSlips([data]);
});

printQueueButton.addEventListener("click", () => {
  printSlips(slips);
});

clearQueueButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all queued slips?")) {
    slips = [];
    renderQueue();
  }
});

// Set up the initial preview and queue.
updatePreview();
renderQueue();