
import axios from 'axios';

export async function call_xmrig_summary(access_token) {
    return axios({
        method: 'get',
        url: 'http://localhost:9999/1/summary',
        headers: {
            common: {
                'Authorization': 'Bearer ' + access_token
            }
        }
    }).then((resp) => {
        let summary_obj = {};
        summary_obj.uptime = resp.data.uptime;
        summary_obj.hashrate = resp.data.hashrate.total[0];
        return summary_obj;
    });
}


export async function call_xmrig_config(access_token) {
    return axios({
        method: 'get',
        url: 'http://localhost:9999/1/config',
        headers: {
            common: {
                'Authorization': 'Bearer ' + access_token
            }
        }
    }).then((resp) => {
        return resp.data;
    });
}