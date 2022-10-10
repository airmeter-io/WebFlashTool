import JSZip from 'jszip';
import { parseJsonText } from 'typescript';


interface IManifestBuildPart {
  path : string;
  offset: number;
}



interface IManifestBuild {
  chipFamily: string;
  improv: boolean;
  parts: IManifestBuildPart[];
}

interface IManifest {
  name : string;
  builds : IManifestBuild[];
}


interface IBuildFile {
  name : string
  data : Uint8Array
}

interface IPartitionResult {
    Partition : IManifestBuildPart;
    File : IBuildFile
}

class BuildData {
   private _zip : Uint8Array;
   private _files : IBuildFile[];
   private _readme : string;
   private _license : string;
   private _manifest : IManifest;

   constructor(pZip : Uint8Array, pFiles: IBuildFile[], pReadme: string, pLicense : string, pManifest: IManifest) {
    this._zip = pZip;
    this._files = pFiles;
    this._readme = pReadme;
    this._license = pLicense;
    this._manifest = pManifest;
   }

   getPartition(pOffset : number) : IPartitionResult  {      
      var part = this._manifest.builds[0].parts.find(part=>part.offset===pOffset);
      var file = this._files.find(file=>file.name===part?.path)
      if(file?.data === undefined || part === undefined) throw Error();
      return { Partition: part, File: file};
   }

   get Manifest() : IManifest {
     return this._manifest;
   }

   getBuildFile(pFileName : string) : IBuildFile {
      for(var i = 0; i < this._files.length;i++)
        if(this._files[i].name === pFileName)
           return this._files[i];

      throw Error("Not Found");
   }

   get Files() { return this._files; }

   withFilesReplaced( pFiles: IBuildFile[]) {
      return new BuildData(this._zip, pFiles, this._readme, this._license, this._manifest);
   }
}


interface IGithubActor {
  login : string;
  id: number;
  node_id: string;
  avatar_url : string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url : string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean
}

interface IGithubAsset {
  url : string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: IGithubActor;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: Date;
  updated_at: Date;
  browser_download_url: string;
}


interface IGithubRelease {
   url : string;
   assets_url : string;
   upload_url : string;
   html_url : string;
   id : number;
   author : IGithubActor;
   node_id:  string;
   tag_name: string;
   target_commitish: string;
   name : string;
   draft: boolean;
   prerelease: boolean;
   created_at: Date;
   published_at: Date;
   assets: IGithubAsset[];
   tarball_url: string;
   zibball_url: string;
   body: string;
}


class BuildManager {
    private _build: IGithubRelease;
    private _asset: IGithubAsset;
    private _data : BuildData;

    constructor(pBuildJson : IGithubRelease, pAssetJson : IGithubAsset) {        
        this._build = pBuildJson;      
        this._asset = pAssetJson;  
    }     

    get Name() : string {
      return this._build.name;
    }

    get Release() : IGithubRelease {
      return this._build;
    }

    get Asset() : IGithubAsset {
      return this._asset;
    }


    get Data() : BuildData {
      return this._data;
    }

    _appendArray(arr1, arr2) : Uint8Array {
      var c = new Uint8Array(arr1.length + arr2.length);
      c.set(arr1, 0);
      c.set(arr2, arr1.length);
      return c;
   }

    async download(pProgress : (string, number)=>void)  {
      pProgress("Initialising build download", 0);
      var response= await fetch(this._asset.name);
      
      if(response==null) {

        return;
      }

      const reader = response.body.getReader();
      var result = new Uint8Array();
      
      while(true) {        
        var percent = result.length / this._asset.size;
        pProgress("Downloading...", percent);
        const {done, value} = await reader.read();
               
        if (done) {
          break;
        }
        result = this._appendArray(result,value );
      
      }


      if(result.length === this._asset.size) {
        var manifest : any = null;

        var zip  = new JSZip();
        var files :IBuildFile[] = [];
        var readme : string = "";
        var license : string = ""; 
        await zip.loadAsync(result);
        for (var name in zip.files)
        {
            var file = zip.files[name];         
            if(name === "manifest.json") {
              manifest = JSON.parse(await file.async("string"));
            } else if (name ==="readme.txt") {
              readme = await file.async("string");
            } else if (name === "LICENSE") {
              license = await file.async("string");
            } else if (name.endsWith(".bin")) {
              files.push({
                name: name,
                data: await file.async("uint8array")
              });
              
            }
        }
        this._data = new BuildData(
          result,
          files,
          readme,
          license,
          manifest);
        pProgress("Downloaded", 100);
      } else {
        throw Error();
      }
    }
  }
export {BuildManager, IManifestBuildPart, IManifestBuild, IManifest, IBuildFile, BuildData, IGithubActor, IGithubAsset, IGithubRelease, IPartitionResult};