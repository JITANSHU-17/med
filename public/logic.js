fetch('/products')
      .then(res => res.json())
      .then(products => {
        const list = document.getElementById('product-list');
        products.forEach(p => {
          const div = document.createElement('div');
          div.innerHTML = `
            <h3>${p.name}</h3>
            <img src="/uploads/${p.image}" alt="${p.name}">
            <p>Price: ₹${p.price}</p>
            <label>Quantity:</label>
            <input type="number" id="qty-${p.id}" value="1" min="1">
            <br>
            <button onclick="orderNow('${p.name}', ${p.price}, ${p.id})">Buy</button>
          `;
          list.appendChild(div);
        });
      });

    function orderNow(name, price, id) {
      const qty = document.getElementById(`qty-${id}`).value;
      const total = price * qty;
      const msg = `Product: ${name}%0AQty: ${qty}%0ATotal: ₹${total}`;
      window.open(`https://wa.me/919999999999?text=${msg}`, '_blank'); // Replace with your WhatsApp number
    }