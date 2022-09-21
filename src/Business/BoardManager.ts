import { IGithubRelease,IGithubAsset,IGithubActor } from './BuildManager';
import { IConnectionInfo } from './ConnectionManager';

class Board {
    private _name : string;
    private _partitionTableOffset : number;
    private _partitionTableSize : number;
    private _buildPrefixes : string[];

    constructor(pName : string, pPartitionTableOffset : number, pPartitionTableSize : number, pBuildPrefixes : string[]) {
        this._name = pName;
        this._partitionTableOffset = pPartitionTableOffset;
        this._partitionTableSize = pPartitionTableSize;
        this._buildPrefixes = pBuildPrefixes;        
    }   

    supportsBuild(pAsset : IGithubAsset) {
        var result = false;
        this._buildPrefixes.forEach(prefix=>{
            if(pAsset.name.startsWith(prefix))
                result = true;
        } );
        return result;
    }

    get Name() : string {
        return this._name;
    }

    get PartitionTableOffset() : number {
        return this._partitionTableOffset;
    }

    get PartitionTableSize() : number {
        return this._partitionTableSize;
    }
}

class ESP32Board extends Board {
    constructor(pName : string, pBuildPrefixes : string[]) {
        super(pName, 0x8000, 3072, pBuildPrefixes);
    }
}

class BoardManager {
    private _boards : Board[] = [
        new ESP32Board("ESP32-D0WDQ6-V3 (revision 3)",["AirMeter.io-binary-esp32-"]),
        new ESP32Board("ESP32-D0WDQ6 (revision 1)",["AirMeter.io-binary-esp32-"])];

    isBoardSupported(pConnection : IConnectionInfo) : boolean {
        for(var i = 0; i < this._boards.length;i++)
        if(this._boards[i].Name===pConnection.chip)
            return true;
        return false
    }

    getBoard(pConnection : IConnectionInfo) : Board {
        if(pConnection===null) return this._boards[0];
        for(var i = 0; i < this._boards.length;i++)
            if(this._boards[i].Name===pConnection.chip)
                return this._boards[i];
        throw new Error();
    }
}

export {BoardManager, Board, ESP32Board};