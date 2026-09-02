import {initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2";

setGlobalOptions({region: "southamerica-east1"});
initializeApp();
