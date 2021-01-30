async function getport() {
    console.log('Looking for port');
    return navigator.serial.getPorts()
        .then(ports => {
            for (var port of ports) {
                console.log("pre-authorized");
                return port;
            }
            const filters = [
                { usbVendorId: 0x0483, usbProductId: 0x5740 },
            ];
            return navigator.serial.requestPort({filters});
        })
}


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function run(data) {
    port = await getport();
    await port.open({'baudRate': 115200, 'flowControl': 'hardware'});
    console.log("port open");
    writer = await port.writable.getWriter();
    await writer.write(data);
    await writer.close();
    await port.close();
    console.log("port closed");
}


async function get(blit) {
    response = await fetch(blit);
    buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}


async function send_file(blit, mode, dir) {

    if (mode == "PROG") {
        dir = "";
    }

    console.log(mode, blit);

    const lastItem = blit.substring(blit.lastIndexOf('/') + 1);

    data = await get(blit)
        .then(data => {
            const enc = new TextEncoder("ascii");
            const cmd = "32BL" + mode + dir + lastItem + "\x00" + data.byteLength + "\x00";
            const header = enc.encode(cmd);
            tmp = new Uint8Array(header.byteLength + data.byteLength);
            tmp.set(header, 0);
            tmp.set(data, header.byteLength);
            return tmp;
        });

    console.log(data.byteLength);

    await run(data);

    console.log("saved " + lastItem);

}


function save(blit) {
    console.log("saving", blit);
    send_file(blit, "SAVE", "/");
}


function flash(blit) {
    console.log("flashing", blit);
    send_file(blit, "PROG", "");
}
