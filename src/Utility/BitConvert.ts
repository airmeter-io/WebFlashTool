const toInt = (src : Uint8Array, startIndex : number) => {        
        return src[startIndex+3] << 24
            | src[startIndex + 2] << 16
            | src[startIndex + 1] << 8
            | src[startIndex];
    };

const toIntBytes = (pValue: number, pDest : Uint8Array, pOffset : number) => { 
        pDest[pOffset] =  pValue & 0xFF;
        pDest[pOffset+1] =  (pValue >> 8) & 0xFF;
        pDest[pOffset+2] =  (pValue >> 16) & 0xFF;
        pDest[pOffset+3] =  (pValue >> 24) & 0xFF;
    };

const toHex = (bytes: number[] | Uint8Array) => {
        if (!Array.isArray(bytes) && !ArrayBuffer.isView(bytes)) {
                throw new TypeError(
                        'The `bytes` argument must be an array or a view of `ArrayBuffer`',
                );
        }

        return [...bytes]
                .map((byte) => (byte & 0xff).toString(16).padStart(2, '0'))
                .join('');
        };

const fromHex = (pHex : string) => {
        var result = new Uint8Array(pHex.length/2);
        for(var i = 0; i< pHex.length;i+=2)
           result[i/2] = parseInt(pHex.substring(i, i+2),16);
        return result;
}

const fromHexToDest = (pHex : string, pDest : Uint8Array, pOffset : number) => {
        for(var i = 0; i< pHex.length;i+=2)
           pDest[pOffset+ i/2] = parseInt(pHex.substring(i, i+2),16);    
}

const compareBytes = (pLeft : Uint8Array, pRight : Uint8Array) => {
      return ((pRight.length >= pLeft.length) && pLeft.every((value, index) => value === pRight[index]));
}

export { toInt, toHex, toIntBytes, fromHex, fromHexToDest, compareBytes };