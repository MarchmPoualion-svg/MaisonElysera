/* Elysera site script.
   1. Draws the placeholder bottle illustrations (swap for product photos later).
   2. Handles the newsletter form.
   3. If Snipcart is NOT installed on the page, runs a simple preview bag so the
      shopping flow can be tried. Once Snipcart is installed, Snipcart takes over
      every "Add to bag" button and the Bag button automatically. */
(function () {
  var TONES = { alpine: "#BCD0DA", vanilla: "#E9D6B4", blossom: "#EDCCD2" };

  function bottle(tone, name) {
    var fill = TONES[tone] || TONES.alpine;
    return (
      '<svg viewBox="0 0 120 260" role="img" aria-label="Elysera ' + name + ' bubble bath bottle">' +
      '<rect x="44" y="6" width="32" height="36" rx="3" fill="#1F2A2E"/>' +
      '<rect x="50" y="42" width="20" height="16" fill="' + fill + '" opacity=".75"/>' +
      '<rect x="16" y="56" width="88" height="198" rx="28" fill="' + fill + '"/>' +
      '<rect x="27" y="74" width="7" height="162" rx="3.5" fill="#FFFFFF" opacity=".35"/>' +
      '<rect x="32" y="116" width="56" height="84" fill="#FFFFFF" opacity=".9"/>' +
      '<text x="60" y="140" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="9" letter-spacing="2.4" fill="#1F2A2E">ELYSERA</text>' +
      '<line x1="46" y1="150" x2="74" y2="150" stroke="#1F2A2E" stroke-width=".6"/>' +
      '<text x="60" y="166" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="7" letter-spacing="1.2" fill="#1F2A2E">' + name.toUpperCase() + '</text>' +
      '<text x="60" y="186" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="5.5" letter-spacing=".8" fill="#5B676A">BUBBLE BATH · 400 ML</text>' +
      '</svg>'
    );
  }

  document.querySelectorAll("[data-bottle]").forEach(function (el) {
    var tone = el.getAttribute("data-bottle");
    if (tone === "trio") {
      el.innerHTML = '<div class="trio">' + bottle("alpine", "Saint Moritz") + bottle("vanilla", "Zanzibar") + bottle("blossom", "Kyoto") + "</div>";
    } else {
      el.innerHTML = bottle(tone, el.getAttribute("data-name") || "");
    }
  });

  // Waitlist: saves sign-ups to the Supabase table public.waitlist (insert-only for visitors).
  var SUPABASE_URL = "https://tlxgjeufrplnwlwtntbc.supabase.co";
  var SUPABASE_KEY = "sb_publishable_OHscSML4gEsBeRH1h1F82w_PVg9EQWW";
  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.parentNode.querySelector(".signup-note");
      var input = form.querySelector("input");
      var email = (input.value || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        note.textContent = "Enter an email address to join the waitlist.";
        return;
      }
      note.textContent = "Adding you to the list…";
      var page = (location.pathname.split("/").pop() || "index").replace(".html", "") || "index";
      fetch(SUPABASE_URL + "/rest/v1/waitlist", {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email: email, source: page })
      }).then(function (res) {
        if (res.ok || res.status === 409) {
          note.textContent = res.status === 409 ? "You're already on the founding-batch list." : "Thank you. You're on the founding-batch list.";
          form.reset();
        } else {
          note.textContent = "That didn't go through. Please try again in a moment.";
        }
      }).catch(function () {
        note.textContent = "That didn't go through. Check your connection and try again.";
      });
    });
  });

  // ---- Preview bag (only when Snipcart is absent) ----
  if (document.getElementById("snipcart")) return;

  var KEY = "elysera-preview-bag";
  var items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { items = []; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function money(n) { return "$" + n.toFixed(2) + " CAD"; }
  function count() { return items.reduce(function (s, i) { return s + i.qty; }, 0); }
  function updateCount() {
    document.querySelectorAll(".snipcart-items-count").forEach(function (el) { el.textContent = count(); });
  }

  var scrim, drawer, lastFocus;

  function render() {
    if (!drawer) return;
    var list = drawer.querySelector(".items");
    if (!items.length) {
      list.innerHTML = '<p class="empty">Your bag is empty.</p>';
    } else {
      list.innerHTML = items.map(function (it, idx) {
        return '<div class="item">' +
          '<span class="name">' + it.name + "</span>" +
          '<span class="price">' + money(it.price * it.qty) + "</span>" +
          '<span class="qty"><button type="button" data-dec="' + idx + '" aria-label="One fewer ' + it.name + '">−</button>' +
          "<span>" + it.qty + "</span>" +
          '<button type="button" data-inc="' + idx + '" aria-label="One more ' + it.name + '">+</button></span>' +
          '<button type="button" class="remove" data-rm="' + idx + '">Remove</button>' +
          "</div>";
      }).join("");
    }
    var total = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    drawer.querySelector(".total span:last-child").textContent = money(total);
    drawer.querySelector(".msg").textContent = "";
    updateCount();
  }

  function build() {
    scrim = document.createElement("div");
    scrim.className = "drawer-scrim";
    scrim.hidden = true;
    drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "bag-title");
    drawer.hidden = true;
    drawer.innerHTML =
      '<header><h2 id="bag-title">Your bag</h2><button type="button" class="close">Close</button></header>' +
      '<div class="items"></div>' +
      '<footer><div class="total"><span>Subtotal</span><span></span></div>' +
      '<p class="ship-note">Shipping and taxes are calculated at checkout. Free shipping in Canada over $75.</p>' +
      '<button type="button" class="btn checkout">Checkout</button><p class="msg" aria-live="polite"></p></footer>';
    document.body.appendChild(scrim);
    document.body.appendChild(drawer);

    scrim.addEventListener("click", close);
    drawer.querySelector(".close").addEventListener("click", close);
    drawer.querySelector(".checkout").addEventListener("click", function () {
      drawer.querySelector(".msg").textContent = items.length
        ? "Online checkout opens shortly. Join the founding-batch list below and we will email you the moment orders open."
        : "Add a bath to your bag first.";
    });
    drawer.addEventListener("click", function (e) {
      var t = e.target;
      var i;
      if ((i = t.getAttribute("data-inc")) !== null) items[+i].qty++;
      else if ((i = t.getAttribute("data-dec")) !== null) { items[+i].qty--; if (items[+i].qty < 1) items.splice(+i, 1); }
      else if ((i = t.getAttribute("data-rm")) !== null) items.splice(+i, 1);
      else return;
      save(); render();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) close(); });
  }

  function open() {
    if (!drawer) build();
    lastFocus = document.activeElement;
    render();
    scrim.hidden = false;
    drawer.hidden = false;
    drawer.querySelector(".close").focus();
  }
  function close() {
    scrim.hidden = true;
    drawer.hidden = true;
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var add = e.target.closest(".snipcart-add-item");
    if (add) {
      var id = add.getAttribute("data-item-id");
      var found = items.filter(function (i) { return i.id === id; })[0];
      if (found) found.qty++;
      else items.push({ id: id, name: add.getAttribute("data-item-name"), price: parseFloat(add.getAttribute("data-item-price")), qty: 1 });
      save();
      var label = add.textContent;
      add.classList.add("added");
      add.textContent = "Added to bag";
      setTimeout(function () { add.classList.remove("added"); add.textContent = label; }, 1400);
      open();
      return;
    }
    if (e.target.closest(".snipcart-checkout")) open();
  });

  updateCount();
})();
