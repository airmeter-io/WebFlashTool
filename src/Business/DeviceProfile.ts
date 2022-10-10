import { file } from 'jszip';
import {BuildManager, BuildData, IBuildFile} from './BuildManager.ts'
import {SpiffsFsReader, SpiffsFsWriter, SpiffsFile, ISpiffsConfig} from './SpiffsFs.ts'

interface ISpiffsFileModification {
    files : SpiffsFile[]
}

class DeviceProfile {
    private _code : string;
    private _name : string;
    private _description : string;
    private _compatibleChipsetIds : string[];

    constructor(pCode : string, pName : string, pDescription : string, pCompitbleChipsetIds : string[]) {   
       this._code = pCode;
       this._name = pName;
       this._description = pDescription;
       this._compatibleChipsetIds = pCompitbleChipsetIds;
    }

    get Code() { return this._code; }
    get Name() { return this._name; }
    get Description() { return this._description; } 
    
    isCompatible(pChipId : string) {
        return this._compatibleChipsetIds.includes(pChipId);
    }
 
    private modifySpiffsPartition(pFile : IBuildFile, pUpdateFiles : (ISpiffsFileModification)=>ISpiffsFileModification) : IBuildFile {      
        var dat = new Uint8Array(pFile.data);
        var spiffsConfig : ISpiffsConfig = {
          blockSize: 4096,
          pageSize: 256,
          objectNameLength: 32, 
          metaLength: 4, 
          useMagicLength : true
        };
        var rea= new SpiffsFsReader(spiffsConfig);
        var modify = { files: rea.getFiles(dat) };
        modify = pUpdateFiles(modify);
        var writer = new SpiffsFsWriter(spiffsConfig);
        writer.writeFiles(dat,modify.files);
        return {
            name: pFile.name,
            data: dat            
        };
    }

    private applyDevPartitionChanges(pBuildManager: BuildManager, pContents : ISpiffsFileModification) {
        pContents.files = pContents.files.filter(pX=>pX.name!='device.json');

        var devicesJson : any = {
            profile: this._code,
            version: pBuildManager.Release.name,
            asset: pBuildManager.Asset.name
        }

        var json = JSON.stringify(devicesJson);

        var bytes = new TextEncoder().encode(json);
        var file = new SpiffsFile("device.json", 0, bytes.byteLength);
        file.Data = bytes;
        pContents.files.push(file);
        return pContents;
    }


    applyToBuildFile(pBuildManager: BuildManager, pFile : IBuildFile) : IBuildFile {
       switch(pFile.name) {
            case "web.bin" : 
                return this.modifySpiffsPartition(pFile, pContents=>pContents);
            case "dev.bin" :
                return this.modifySpiffsPartition(pFile, pContents=>this.applyDevPartitionChanges(pBuildManager, pContents));
            default :
               return pFile;
        }
       
    }
 }


 export {DeviceProfile}