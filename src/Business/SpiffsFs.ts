import {toInt, toIntBytes, toInt16, toInt16Bytes, appendByteArray } from '../Utility/BitConvert.ts'
interface ISpiffsConfig {
    blockSize : number;
    pageSize : number;
    objectNameLength : number;
    metaLength : number;
    useMagicLength : boolean;
}

class SpiffsPageHeader {
    private _flags : number = 0xff;
    private _objId : number = 0;
    private _spanIx : number = 0;
    private _isIndex : boolean;

    get Flags() : number { return this._flags;}
    get ObjId() : number { return this. _objId;}
    get SpanIx() : number { return this._spanIx;}
    set Flags(pFlags : number) { this._flags = pFlags; }
    set ObjId(pObjId : number) { this._objId = pObjId; }
    set SpanIx(pSpanIx : number) { this._spanIx = pSpanIx; }

    loadFrom(pData : Uint8Array, pOffset : number) : number {
        this._objId = pData[pOffset] + (pData[pOffset+1] << 8);
        if(this._objId!==0xFFFF && this._objId & 0x8000) {
            this._isIndex = true;
            this.ObjId ^= 0x8000;
        }
        this._spanIx = pData[pOffset+2] + (pData[pOffset+3] << 8);
        this._flags = pData[4];
        return pOffset + 6;
    }

    saveTo(pData : Uint8Array, pOffset : number) : number {
        var objId = this._isIndex ? this._objId | 0x8000 : this._objId;
        pData[pOffset] = objId & 0xFF;
        pData[pOffset+1] = (objId >> 8) & 0xFF;
        pData[pOffset+2] = this._spanIx & 0xFF;
        pData[pOffset+3] = (this._spanIx >> 8) & 0xFF;
        pData[pOffset+4] = this._flags;

        return pOffset + 6;
    }


    get IsUsed() : boolean { return (this._flags & 1) === 0; }
    set IsUsed(pValue : boolean) { !pValue ? this._flags |= 1 : this._flags ^= 1; }
    get IsFinal() : boolean { return (this._flags & (1<<1)) === 0; }
    set IsFinal(pValue : boolean) { !pValue ? this._flags |= (1<<1) : this._flags ^= (1<<1); }
    get IsIndexFlag() : boolean { return (this._flags & (1<<2)) === 0; }
    set IsIndexFlag(pValue : boolean) { !pValue ? this._flags |= (1<<2) : this._flags ^= (1<<2); }    
    get IsIndex() : boolean { return this._isIndex; }
    set IsIndex(pValue : boolean) { this._isIndex = pValue; }
    get IsDeleted() : boolean { return (this._flags & (1<<7)) === 0; }
    set IsDeleted(pValue : boolean) { !pValue ? this._flags |= (1<<7) : this._flags ^= (1<<7); }   
    get IsIndexDeleted() : boolean { return (this._flags & (1<<6)) === 0; }
    set IsIndexDeleted(pValue : boolean) { !pValue ? this._flags |= (1<<6) : this._flags ^= (1<<6); } 
}


abstract class SpiffsPage {
    private _header : SpiffsPageHeader;
    private _config : ISpiffsConfig;

    constructor(pConfig : ISpiffsConfig, pHeader : SpiffsPageHeader) {
        this._header = pHeader;
        this._config = pConfig;
    }

    get Header() : SpiffsPageHeader  {return this._header; }
    get Config() : ISpiffsConfig  {return this._config; }

    abstract loadFrom(pData : Uint8Array, pOffset : number) : number;
    abstract saveTo(pData : Uint8Array, pOffset : number) : number;
}

class SpiffsIndexPage extends SpiffsPage {
    private _size : number;
    private _type : number;
    private _name : string;
    private _meta : Uint8Array;
    private _blockIds : number[];

    constructor(pConfig : ISpiffsConfig, pHeader : SpiffsPageHeader) {
      super(pConfig,pHeader);
      this._blockIds = [];
    }

    get Name() : string {
        return this._name;
    }

    set Name(pName) {
        this._name = pName;
    }

    get Size() : number {
        return this._size;
    }

    set Size(pValue) {
        this._size = pValue;
    }

    get Type() : number {
        return this._type;
    }

    set Type(pType) {
        this._type = pType;
    }

    get Meta() : Uint8Array {
        return this._meta;
    }

    get BlockIds() : number[] {
        return this._blockIds;
    }

    get MaxBlockIds() : number {
        var available = this.Config.pageSize - 8;
        
        if(this.Header.SpanIx==0) {
            available -= 5 + this.Config.objectNameLength+this.Config.metaLength;
        }

        return Math.floor(available/2);
    }


    override loadFrom(pData : Uint8Array, pOffset : number) : number {
        var offset = this.Header.loadFrom(pData, pOffset);
        offset+=2;        
        if(this.Header.SpanIx==0) {

            this._size = toInt(pData, offset);
            offset+=4;
            this._type = pData[offset];
            offset++;
            this._name = new TextDecoder().decode(pData.slice(offset, offset+this.Config.objectNameLength)).replace(/\0[\s\S]*$/g,'').trim();
            offset+=this.Config.objectNameLength;
            this._meta = pData.slice(offset, this.Config.metaLength);
            offset+=this.Config.metaLength;
        }

        this._blockIds = [];
        try {

        for(;offset+1< pOffset+this.Config.pageSize&& toInt16(pData, offset)!=0xFFFF; offset+=2) 
            this._blockIds.push(toInt16(pData, offset));

        } catch (exception) {
            console.log(exception);
        }
        return pOffset+this.Config.pageSize;
    }


    override saveTo(pData : Uint8Array, pOffset : number) : number {
        
        pData.fill(0xFF, pOffset, pOffset+this.Config.pageSize)
        var offset = this.Header.saveTo(pData, pOffset);
        offset+=2;
        if(this.Header.SpanIx==0) {
            toIntBytes(this._size, pData, offset);
            offset+=4;
            pData[offset] = this._type;
            offset++;
            var nameBytes = new TextEncoder().encode(this._name);
            for(var i = 0; i < this.Config.objectNameLength;i++) {
                pData[offset] = i<nameBytes.length? nameBytes[i] : 0;
                offset++;
            }

            for(var i = 0; i < this.Config.metaLength;i++) {                
                pData[offset] = this._meta!==undefined && i<this._meta.length? this._meta[i] : 0;
                offset++;
            }
        }

        for(var i = 0;i < this._blockIds.length;i++) {
            if(offset+1>=pOffset+this.Config.pageSize) 
                throw RangeError("Too many block ids for index page");
            toInt16Bytes(this._blockIds[i], pData, offset)
            offset+=2;
        }
        return pOffset+this.Config.pageSize;
    }
}

class SpiffsDataPage extends SpiffsPage {
    private _data : Uint8Array;
    constructor(pConfig : ISpiffsConfig, pHeader : SpiffsPageHeader) {
        super(pConfig, pHeader);
    }

    override loadFrom(pData : Uint8Array, pOffset : number) : number {
        var offset = this.Header.loadFrom(pData, pOffset)-1;
        this._data = pData.slice(offset, pOffset+this.Config.pageSize);
        return pOffset+this.Config.pageSize;
    }

    override saveTo(pData : Uint8Array, pOffset : number) : number {
        var offset = this.Header.saveTo(pData, pOffset);
        offset--;
        for(var i = 0;offset <  pOffset+this.Config.pageSize; offset++, i++) {
            pData[offset] = i<this._data.byteLength ? this._data[i] : 0xFF;
        }
        return pOffset+this.Config.pageSize;
    }

    get Data() : Uint8Array {
        return this._data;
    }

    set Data(pData) {
        this._data = pData;
    }

    get MaxData()  {
        return this.Config.pageSize-5;
    }
}

class SpiffsBlockHeaderPage {
    private _config : ISpiffsConfig;
    private _blockIndex : number;
    private _objIds : number[] = [];
    get Config() : ISpiffsConfig  {return this._config; }
    

    constructor(pConfig : ISpiffsConfig) {
        this._config = pConfig;
        this._objIds = [];
    }
    
    get ObjIds() {
        return this._objIds;
    }

    calcMagicBytes(pBlock : number, pBlockCount : number) : Uint8Array {
        var magic : number = this.Config.useMagicLength ? 0x20140529^this.Config.pageSize^(pBlockCount - pBlock) : 0x20140529^this.Config.pageSize;
        var result : number[] =  [];
        result.push(magic & 0xFF);
        result.push((magic >> 8) & 0xFF);
        return new Uint8Array( result);
    }

    loadFrom(pData : Uint8Array, pOffset : number) : number {
        var blockIndex = pOffset / this.Config.blockSize;

        var magicBytes = this.calcMagicBytes(blockIndex, pData.length/this.Config.blockSize);
        if(magicBytes[0]!=pData[pOffset+this.Config.pageSize-4] || 
           magicBytes[1]!=pData[pOffset+this.Config.pageSize-3] ) {
            throw Error("Magic does not match on block  " +blockIndex);
        }
        this._objIds = [];
        for(var i = 0; i < this.Config.blockSize/this.Config.pageSize; i++) {
            this._objIds.push(toInt16(pData, pOffset+i*2));
        }

        return pOffset+this.Config.pageSize;
    }

    saveTo(pData : Uint8Array, pOffset : number) : number {
        var blockIndex = pOffset / this.Config.blockSize;
        pData.fill(0xFF, pOffset, pOffset+this.Config.pageSize)
        var magicBytes = this.calcMagicBytes(blockIndex, pData.length/this.Config.blockSize);
        pData[pOffset+this.Config.pageSize-4] = magicBytes[0];
        pData[pOffset+this.Config.pageSize-3] = magicBytes[1];
        

        for(var i = 0; i < this.Config.blockSize/this.Config.pageSize; i++) {
            if(i < this._objIds.length)
                toInt16Bytes(this._objIds[i], pData, pOffset+i*2)           
        }
        return pOffset+this.Config.pageSize;
    }
}




class SpiffsFile {    
    private _name : string;
    private _data : Uint8Array = new Uint8Array();
    private _objId : number = 0;
    private _size : number;

    constructor(pName : string, pObjId : number, pSize : number) {
        this._name =  pName;
        this._objId = pObjId;
        this._size = pSize;
    }

    get Name() : string { return this._name; }
    get Size() : number { return this._size; }
    get Data() : Uint8Array { return this._data; }

    set Data(pData : Uint8Array) {this._data = pData; }
    get ObjId() : number { return this. _objId;}   
}

class SpiffsFsReader {
    private _config : ISpiffsConfig;
    constructor(pConfig : ISpiffsConfig) {
        this._config = pConfig;
    }

    getFiles(pData : Uint8Array) : SpiffsFile[] {
        var result : SpiffsFile[] = [];

        function GetFile(pObjId : number) : SpiffsFile | null {
            for(var i = 0; i < result.length; i++)
                if(result[i].ObjId === pObjId)
                    return result[i];
            return null;
        }

        function GetFileOrAdd(pName : string, pObjId : number, pSize : number) : SpiffsFile {
            for(var i = 0; i < result.length; i++)
                if(result[i].ObjId === pObjId)
                    return result[i];
            var file = new SpiffsFile(pName, pObjId, pSize);
            result.push(file);
            return file;
        }

        var blockCount = pData.length/this._config.blockSize;
        var pagesPerBlock = this._config.blockSize/this._config.pageSize;
        for(var block = 0; block < blockCount; block++) {
            for(var page = 0; page < pagesPerBlock; page++) {
                var offset = (this._config.blockSize*block) + (this._config.pageSize*page);

                if(page === 0 ) {
                    var header = new SpiffsBlockHeaderPage(this._config);
                    header.loadFrom(pData, offset);
                } else {
                    var pageHeader = new SpiffsPageHeader();
                    pageHeader.loadFrom(pData, offset);
                    
                    if(pageHeader.ObjId === 0xFFFF) {

                    } else if(pageHeader.IsIndex) {
                        var indexPage = new SpiffsIndexPage(this._config, pageHeader);

                        indexPage.loadFrom(pData, offset);
                        var file = indexPage.Header.SpanIx == 0 ? GetFileOrAdd(indexPage.Name, indexPage.Header.ObjId, indexPage.Size) :
                                                                  GetFile(indexPage.Header.ObjId);
                        if(file === null){                            
                            throw Error("Unexpected objected ID "+indexPage.Header.ObjId);
                        }

                        for(var blockId = 0; blockId < indexPage.BlockIds.length; blockId++)
                        {
                            var dataPageIndex = indexPage.BlockIds[blockId];
                            if(dataPageIndex!=0xFFFF) {
                                var dataPage = new SpiffsDataPage(this._config, pageHeader);
                                dataPage.loadFrom(pData, dataPageIndex*this._config.pageSize);
                                var pageData = dataPage.Data;
                                if(file.Data.byteLength+pageData.byteLength > file.Size ) {
                                    file.Data = appendByteArray(file.Data, pageData.slice(0,  file.Size - file.Data.byteLength) );
                                } else
                                    file.Data = appendByteArray(file.Data, pageData );
                            }
                        }                        

                    } else {
                       

                    }
                }

                
            }
        }

        return result;
    }
}

class SpiffsFsWriter {
    private _config : ISpiffsConfig;
    constructor(pConfig : ISpiffsConfig) {
        this._config = pConfig;
    }

    writeFiles(pData : Uint8Array, pFiles : SpiffsFile[]) {
        pData.fill(0xff);
        var blockCount = pData.length/this._config.blockSize;
        var pagesPerBlock = this._config.blockSize/this._config.pageSize;

        var currentIndexPageOffset = 0;
        var currentIndexPage : SpiffsIndexPage | null = null;
        var fileIndex = 0;
        var fileDataIndex = 0;
        var fileData = new Uint8Array(pFiles[fileIndex].Data);
        var fileSpanIndex = 0;
        var nextObjId = 0;
        for(var block = 0; block < blockCount; block++) {
            var blockOffset = block * this._config.blockSize;
            var blockHeader = new SpiffsBlockHeaderPage(this._config);

            for(var page = 1; page < pagesPerBlock && fileIndex < pFiles.length; page++) {
                if(currentIndexPage==null || currentIndexPage.BlockIds.length >= currentIndexPage.MaxBlockIds) {
                    if(currentIndexPage!==null) 
                        currentIndexPage.saveTo(pData, currentIndexPageOffset);

                    currentIndexPageOffset = (page*this._config.pageSize) + blockOffset;
                    var header = new SpiffsPageHeader();
                    header.IsIndex = true;
                    header.IsUsed  = true;
                    header.IsFinal = true;
                    header.IsIndexFlag = true;
                    var isFirstSpan = false;
                    if(currentIndexPage == null) {
                        nextObjId++;
                        header.ObjId = nextObjId;
                        header.SpanIx = 0;
                        isFirstSpan = true;

                    } else {
                        header.ObjId = currentIndexPage.Header.ObjId;
                        header.SpanIx = currentIndexPage.Header.SpanIx + 1;
                    }
                    blockHeader.ObjIds.push(header.ObjId | 0x8000);
                    currentIndexPage = new SpiffsIndexPage(this._config, header);
                    if(isFirstSpan) {
                        currentIndexPage.Name = pFiles[fileIndex].Name;
                        currentIndexPage.Size = pFiles[fileIndex].Data.byteLength;
                        currentIndexPage.Type = 1;
                    }
                } else {
                    var header = new SpiffsPageHeader();
                    header.ObjId = currentIndexPage.Header.ObjId;
                    header.SpanIx = fileSpanIndex;
                    header.IsUsed  = true;
                    header.IsFinal = true;
                    fileSpanIndex++;
                    var dataPage = new SpiffsDataPage(this._config, header);
                    currentIndexPage.BlockIds.push(page+block*pagesPerBlock);
                    blockHeader.ObjIds.push(header.ObjId);
                    if(fileDataIndex+dataPage.MaxData<fileData.byteLength) {
                        dataPage.Data = fileData.slice(fileDataIndex, fileDataIndex+dataPage.MaxData);
                        fileDataIndex+=dataPage.MaxData;
                    } else {
                        dataPage.Data = fileData.slice(fileDataIndex, fileData.byteLength);
                        fileDataIndex = fileData.byteLength;
                    }

                    dataPage.saveTo(pData, blockOffset+page*this._config.pageSize);
                    
                    if(fileDataIndex>=fileData.byteLength) {
                        currentIndexPage.saveTo(pData, currentIndexPageOffset);
                        fileIndex++;
                        if(fileIndex<pFiles.length) {
                            fileData = new Uint8Array(pFiles[fileIndex].Data);
                            fileDataIndex = 0;
                            fileSpanIndex = 0;
                            currentIndexPage = null;
                        } else
                            break;
                    }

                }
            }

            blockHeader.saveTo(pData, blockOffset);
        }
    }
}


export { SpiffsFsReader, SpiffsFsWriter, SpiffsFile, ISpiffsConfig };