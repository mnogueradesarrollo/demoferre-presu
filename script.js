(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const LS = {
    get(k, d) {
      try {
        return JSON.parse(localStorage.getItem(k)) || d;
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      localStorage.setItem(k, JSON.stringify(v));
    },
  };

  const defaults = {
    name: "Tu Comercio",
    sub: "Rubro o lema",
    contact: "Dirección · Teléfono",
    footer: "Gracias por su consulta",
    prefix: "",
    next: 1,
  };
  const biz = Object.assign({}, defaults, LS.get("ps_biz", {}));

  function renderBiz() {
    $("#biz-name").textContent = biz.name;
    $("#biz-sub").textContent = biz.sub;
    $("#biz-contact").textContent = biz.contact;
    $("#biz-footer").textContent = biz.footer;
    const seqValue =
      (biz.prefix ? biz.prefix + "-" : "") + String(biz.next).padStart(4, "0");
    $("#seq").textContent = seqValue;
    $("#biz-seq-footer").textContent = "Presupuesto Nº " + seqValue;
  }

  function today() {
    return new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  $("#today").textContent = today();

  const tbody = $("#items tbody");

  function addRow(d = { qty: "", unit: "", desc: "", price: "" }) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input type="number" value="${d.qty}"></td>
    <td><input type="text" value="${d.unit}"></td>
    <td><input type="text" value="${d.desc}"></td>
    <td><input type="number" value="${d.price}"></td>
    <td class="subtotal">—</td>
    <td><button>✕</button></td>`;
    tbody.appendChild(tr);
    tr.querySelectorAll("input").forEach((i) =>
      i.addEventListener("input", recalc)
    );
    tr.querySelector("button").addEventListener("click", () => {
      tr.remove();
      recalc();
    });
  }

  function money(n) {
    return Number(n || 0).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
  }

  function recalc() {
    let total = 0;
    $$("#items tbody tr").forEach((tr) => {
      const qty = parseFloat(tr.children[0].firstChild.value) || 0;
      const price = parseFloat(tr.children[3].firstChild.value) || 0;
      const sub = qty * price;
      tr.querySelector(".subtotal").textContent = sub ? money(sub) : "—";
      total += sub;
    });
    $("#grand").textContent = money(total);
  }

  async function newDoc() {
    $("#client").value = "";
    $("#address").value = "";
    $("#notes").value = "";
    tbody.innerHTML = "";
    for (let i = 0; i < 5; i++) addRow();

    // 🔄 Tomar número desde Firebase
    const numeroRef = dbRef(window.db, "presupuesto/numero_actual");
    try {
      const snapshot = await dbTransaction(numeroRef, (curr) => {
        return (curr || 0) + 1;
      });

      const newNumber = snapshot.snapshot.val();
      biz.next = newNumber;
      LS.set("ps_biz", biz);
      renderBiz();
      $("#today").textContent = today();
    } catch (error) {
      alert("Error al obtener número de presupuesto desde Firebase");
      console.error(error);
    }
  }

  $("#btn-print").addEventListener("click", () => window.print());

  $("#btn-pdf").addEventListener("click", () => {
    const element = document.querySelector("#sheet-card");
    const fileName =
      "Presupuesto-" + document.querySelector("#seq").textContent + ".pdf";

    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  });

  $("#btn-new").addEventListener("click", newDoc);
  $("#btn-add-row").addEventListener("click", () => addRow());

  const dlg = $("#settings");
  $("#btn-settings").addEventListener("click", () => {
    $("#s-name").value = biz.name;
    $("#s-sub").value = biz.sub;
    $("#s-contact").value = biz.contact;
    $("#s-footer").value = biz.footer;
    $("#s-prefix").value = biz.prefix;
    $("#s-next").value = biz.next;
    dlg.showModal();
  });

  $("#save-settings").addEventListener("click", (e) => {
    e.preventDefault();
    biz.name = $("#s-name").value;
    biz.sub = $("#s-sub").value;
    biz.contact = $("#s-contact").value;
    biz.footer = $("#s-footer").value;
    biz.prefix = $("#s-prefix").value;
    biz.next = Number($("#s-next").value) || biz.next;
    LS.set("ps_biz", biz);
    renderBiz();
    dlg.close();
  });

  // 🔁 Al cargar la página: sincronizar con Firebase para obtener el último número
  (async () => {
    const numeroRef = window.dbRef(window.db, "presupuesto/numero_actual");

    try {
      const snapshot = await window.dbGet(numeroRef);

      if (snapshot.exists()) {
        const ultimo = snapshot.val();
        biz.next = ultimo;
        LS.set("ps_biz", biz);
      } else {
        // Si no existe en Firebase, inicializamos con 1
        await window.dbSet(numeroRef, 1);
        biz.next = 1;
        LS.set("ps_biz", biz);
      }
    } catch (e) {
      console.warn("No se pudo obtener el número de Firebase:", e);
    }

    // Solo después de sincronizar mostramos todo
    renderBiz();
    for (let i = 0; i < 5; i++) addRow();
    recalc();
  })();
})();
