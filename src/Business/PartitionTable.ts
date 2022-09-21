
import {Md5} from 'ts-md5';
import {toInt, toIntBytes, toHex, fromHexToDest} from '../Utility/BitConvert.ts'



class PartitionTableEntry {    
    private _type : number;
    private _subType : number;
    private _offset : number;
    private _size : number;
    private _name : string;
    constructor(pBinFile : Uint8Array, pOffset : number) {
        this._type = pBinFile[pOffset+2];
        this._subType = pBinFile[pOffset+3];
        this._offset = toInt(pBinFile, pOffset+4);
        this._size = toInt(pBinFile, pOffset+8);
        this._name = new TextDecoder().decode(pBinFile.slice(pOffset+12, pOffset+32)).trim();
    }

    get Type() : number { return this._type; }
    get SubType() : number { return this._subType; }
    get Offset() : number { return this._offset; }
    get Size() : number { return this._size; }
    get Name() : string { return this._name; }
    set Type(pType : number) {
        if(pType <0 || pType>254) 
            throw new RangeError("Type must be a value between 0 and 254");
        this._type = pType;
    }
    set SubType(pSubType : number) {
        if(pSubType <0 || pSubType>254) 
            throw new RangeError("SubType must be a value between 0 and 254");
        this._subType = pSubType;
    }
    set Offset(pOffset : number) {
        if(pOffset <0 || pOffset>0xffffffff) 
            throw new RangeError("Offset must be a value between 0 and 0xffffffff");
        this._offset = pOffset;
    }
    set Size(pSize : number)  {
        if(pSize <0 || pSize>0xFFFFFFFF) 
            throw new RangeError("Size must be a value between 0 and 0xffffffff");
        this._size = pSize;
    }
    set Name(pName : string)  {
        var bytes = new TextEncoder().encode(pName);
        if(bytes.length==0 || bytes.length>16) 
            throw new RangeError("Name must not be blank and must be 16 bytes or less");
        this._name = pName;
    }

    getTypeString() : string {
        switch(this._type) {
            case 0 : return "app";
            case 1 : return "data";
            default : return this._type.toString(16);
        }
    }

    getSubTypeString() : string {
        switch(this._type) {
            case 0 : return "ota";
            case 1 : return "phy";
            case 2 : return "nvs";
            case 3 : return "coredump";
            case 4 : return "nvs_keys";
            case 5 : return "efuse";
            case 6 : return "espundefined";
            case 0x80 : return "esphttpd";
            case 0x81 : return "fat";
            case 0x82 : return "spiffs";
            default : return this._type.toString(16);
        }
    }

    toString() : string {
        return "Type: "+this.getTypeString()+", Sub Type: "+this.getSubTypeString()+", Size: 0x"+this._size.toString(16)+", Offset: 0x"+this._offset.toString(16)+", Name: "+this._name;
    }

    saveTo(pOutput : Uint8Array, pOffset: number) : void {
        if(pOffset + 64 <= pOutput.length)
            throw RangeError("There must be enough buffer space for this entry and the trailing terminating entry");

        pOutput[pOffset] = 0xaa;
        pOutput[pOffset+1] = 0x50;
        pOutput[pOffset+2] = this._type;
        pOutput[pOffset+3] = this._subType;
        toIntBytes(this._offset, pOutput, pOffset+4);
        toIntBytes(this._size, pOutput, pOffset+8);
        var nameBytes = new TextEncoder().encode(this._name);
        for(var i = 0;i<16; i++)
            if(i<nameBytes.length)
                pOutput[pOffset+16+i] = nameBytes[i];        
            else 
                pOutput[pOffset+16+i] = 0;
    }
}

class PartitionTableCorruptionException  {
    private _message : string;
    constructor(pMessage : string) {
        this._message = pMessage;
    }

    get Message() : string  {
        return this._message;
    }
}

const MAX_ENTRIES = 95;

class PartitionTable {
    private _entries : PartitionTableEntry[] = [];
    constructor(pBinFile : Uint8Array) {
        if(pBinFile.length!=3072)
            throw new PartitionTableCorruptionException("Incorrect length");
        for(var index = 0; index < 3072-32; index+=32) {
            if(pBinFile[index] == 0xaa && pBinFile[index+1] == 0x50) {
                this._entries.push(new PartitionTableEntry(pBinFile, index));                
            } else if(pBinFile[index] == 0xeb && pBinFile[index+1] == 0xeb) {
                for(var i =0; i<14;i++)
                    if(pBinFile[index+i+2]!=0xFF)
                        throw new PartitionTableCorruptionException("Invalid terminating entry");

                var md5 = new Md5();
                md5.appendByteArray(pBinFile.slice(0,index));                
                var calcedMd5 = md5.end();
                var givenMd5  : Uint8Array = pBinFile.slice(index+16,index+32);
                var presMd5 =toHex(givenMd5);
                if(presMd5!=calcedMd5)
                    throw new PartitionTableCorruptionException("Partition Table MD5 is incorrect");
                break;
            } else {
                throw new PartitionTableCorruptionException("Entry "+index+" has an invalid magic");
            }
        }
    }

    get Entries() : PartitionTableEntry[] {
        return this._entries;
    }

    save() {
        var result = new Uint8Array(3072);
        result.fill(0xFF);
        
        var offset = 0;
        this._entries.forEach(element => {
            element.saveTo(result, offset);
            offset+=32;
        });
        result[offset] = 0xeb;
        result[offset+1] = 0xeb;    
        var md5 = new Md5();
        md5.appendByteArray(result.slice(0,offset));                
        var md5Hash : string = md5.end()?.toString();
        fromHexToDest(md5Hash, result, offset+16);

        return result;
    }

    add(pEntry : PartitionTableEntry) {
        if(this._entries.length>=MAX_ENTRIES)
            throw new RangeError("Maximum entries in partition table reached");
        this._entries.push(pEntry);
    }

    delete(pEntry : PartitionTableEntry) {
        var entries : PartitionTableEntry[] = [];
        this._entries.forEach(entry => {
            if(entry != pEntry)
                entries.push(entry);
        });
        this._entries = entries;
    }

    get(pIndex : number) : PartitionTableEntry {
        return this._entries[pIndex];
    }

    
    getByOffset(pOffset : number) : PartitionTableEntry {
        var result =  this._entries.find(entry=>entry.Offset === pOffset);
        if(result === undefined) 
            throw new Error();

        return result;
    }

    count() {
        return this._entries.length;
    }
}

export { PartitionTable, PartitionTableEntry };