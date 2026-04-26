const url = '/api/Save-JSON'; // Относительный путь через NGINX (порт 20000) 
const resultDiv = document.getElementById('result');

const getInputs = () => ({
    op: document.getElementById('op').value,
    x: parseInt(document.getElementById('x').value),
    y: parseInt(document.getElementById('y').value)
});

async function doGet() {
    const response = await fetch(url, { method: 'GET' }); 
    const data = await response.json();
    resultDiv.innerText = JSON.stringify(data);
}

async function doPost() {
    const response = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getInputs())
    });
    const data = await response.json();
    resultDiv.innerText = JSON.stringify(data);
}

async function doPut() {
    const response = await fetch(url, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getInputs())
    });
    const data = await response.json();
    resultDiv.innerText = JSON.stringify(data);
}

async function doDelete() {
    const response = await fetch(url, { method: 'DELETE' }); 
    const data = await response.json();
    resultDiv.innerText = JSON.stringify(data);
}