import {DeviceProfile, DeviceProfiles} from './DeviceProfiles.ts'
import {IConnectionInfo } from './ConnectionManager.ts'



class DeviceManager {
   private _mac : string;
   private _chipId : string;
   private _flashSize : number; 

   private _profile : DeviceProfile|null;
   private _devices : DevicesManager;
   constructor(pDevices : DevicesManager, pDevicePersistedInfo : any) {   
      this._devices = pDevices;
      this._mac = pDevicePersistedInfo.mac;
      this._chipId = pDevicePersistedInfo.chipId;
      this._flashSize = pDevicePersistedInfo.flashSize;

      var profile = pDevicePersistedInfo.profile;
      if(profile === "default") 
         this._profile = this._devices.Profiles.getCompatibleProfiles(this._chipId).length=== 0? null :
                         this._devices.Profiles.getCompatibleProfiles(this._chipId)[0];
      else  
         this._profile = pDevices.Profiles.getProfile(profile);
   }  

   get Mac() { return this._mac; }
   get Profile() { 
      return this._profile; 
   }

   set Profile(pProfile : DeviceProfile) {
      if(!pProfile.isCompatible(this._chipId))
         throw Error("Not compatible");
      this._profile = pProfile;
   }

   get AvailableProfiles() {
      return this._devices.Profiles.getCompatibleProfiles(this._chipId);
   }


   get DeviceRecord() : any { 
      return { 
         mac: this._mac,  
         profile: this._profile === null ? "default" : this._profile.Code
      }
   }
}

class DevicesManager {
    private _db : IDBDatabase;
    private _profiles : DeviceProfiles = new DeviceProfiles();
    constructor() {             
    }    
    
    
    get Profiles() { return this._profiles; }

    async startup() {
        var thus = this;
        return new Promise<void>((resolve, reject) => {
            if (!window.indexedDB) {
                throw Error("Your browser doesn't support a stable version of IndexedDB.");
             }
             
             var request = window.indexedDB.open("newDatabase", 1);
         
             
             request.onerror = function(event) {
                reject("error");
             };
             
             request.onsuccess = function(event) {  
                thus._db = request.result;              
                resolve();
             };
             
             request.onupgradeneeded = function(event) {
                var db = event.target.result;
                var objectStore = db.createObjectStore("devices", {keyPath: "mac"});
             
             };
           
          });
    }


    private createNewDevice(pDevice: DeviceManager) {
      return new Promise<void>((resolve, reject) => {
         var transaction = this._db.transaction(["devices"], "readwrite");
         var objectStore = transaction.objectStore("devices");
         var request = objectStore.add(pDevice.DeviceRecord);
         
         request.onsuccess = function(event) {
           resolve();
         };
         
         request.onerror = function(event) {
            reject("Error")
         }                
       });
    }

   async getOrCreateDevice(pInfo : IConnectionInfo) {
      var device = await this.getDevice(pInfo);
      if(device === null) {
         device = new DeviceManager(this, {mac: pInfo.mac, chipId: pInfo.chip, flashSize: pInfo.flashSize, profile: 'default'});
         await this.createNewDevice(device);
      }
      return device;
    }

   private async getDevice(pInfo : IConnectionInfo) : Promise<DeviceManager|null> {
      return new Promise<DeviceManager|null>((resolve, reject) => {
         var transaction = this._db.transaction(["devices"]);
         var objectStore = transaction.objectStore("devices");
         var request = objectStore.get(pInfo.mac);
         var thus = this;
         request.onerror = function(event) {
            reject("Error!")
         };
         
         request.onsuccess = function(event) {
            // Do something with the request.result!
            if(request.result) {
               resolve(new DeviceManager(thus, request.result));
            } else {               
               resolve(null);
            }
         };        
       });
   }         
}
export {DevicesManager};