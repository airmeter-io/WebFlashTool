import {DeviceProfile} from './DeviceProfile.ts'

 class DeviceProfiles {
    private _profiles : DeviceProfile[] = [
        new DeviceProfile(
            "EPD-DEPG0213BN",
            "2.13in electronic paper (DEPG0213BN)", 
            "Portable device using either Senseair Sunrise or SCD30 with a 2.13in EPD display. This profile is intended for devices based on the LilyGo DEPG0213BN 2.13in EPD ESP32 board.",
            ["ESP32-D0WDQ6-V3 (revision 3)"],
            pDevicesJson => {
                pDevicesJson.Display = {
                    Controller: "ssd1680",
                    Panel: "DEPG0213BN"
                };
            }),
        new DeviceProfile(
            "EPD-GDEM0213B74",
            "2.13in electronic paper (GDEM0213B74)", 
            "Portable device using either Senseair Sunrise or SCD30 with a 2.13in EPD display. This profile is intended for devices based on the LilyGo DEPG0213BN 2.13in EPD ESP32 board.",
            ["ESP32-D0WDQ6-V3 (revision 3)"],
            pDevicesJson => {
                pDevicesJson.Display = {
                    Controller: "ssd1680",
                    Panel: "GDEM0213B74"
                };
            })
    ];

    getProfile(pProfileName : string) {
        return this._profiles.find(pX=>pX.Code == pProfileName);
    }

    getCompatibleProfiles(pChipId : string) {        
        return this._profiles.filter(pX=>pX.isCompatible(pChipId));
    }
 }

 export {DeviceProfiles}