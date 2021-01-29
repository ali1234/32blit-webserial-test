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

async function run(data, headerlen) {
    port = await getport();

    await port.open({'baudRate': 9600});

    console.log(headerlen);
    console.log("port open");
    writer = await port.writable.getWriter();
    console.log("writer got", writer);
    x = await writer.write(data.slice(0, headerlen));
    console.log(data.slice(0, headerlen));
    for (z=headerlen;z<data.byteLength; z+=64) {
        x = await writer.write(data.slice(z, z + 64));
        console.log(data.slice(z, z + 64));
        await timeout(10);
    }
    console.log("written", x);
    x = await writer.releaseLock();
    await timeout(50);
    console.log("release", x);
    x = await port.close();
    console.log("port closed", x);
}


async function get(blit) {
    return fetch(blit).then(response => response.arrayBuffer());
}


async function send_file(blit, dest, dir) {

    if (dest == "sd") {
        mode = "SAVE";
        headerlen = 30;
    } else {
        mode = "PROG";
        headerlen = 29;
        dir = "";
    }

    console.log(mode, blit);

    const lastItem = blit.substring(blit.lastIndexOf('/') + 1);

    data = await get(blit)
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const enc = new TextEncoder("ascii");
            const cmd = "32BL" + mode + dir + lastItem + "\x00" + data.byteLength + "\x00";
            header = enc.encode(cmd);
            console.log(cmd, header.byteLength, data.byteLength);
            tmp = new Uint8Array(header.byteLength + data.byteLength);
            tmp.set(header, 0);
            tmp.set(data, header.byteLength);
            return tmp;
        });

    console.log(data.byteLength);

    await run(data, headerlen);

    console.log("saved " + lastItem);

}


function save(blit) {
    console.log("saving", blit);
    send_file(blit, "sd", "/");
}

function flash(blit) {
    console.log("flashing", blit);
    send_file(blit, "flash", "");
}
