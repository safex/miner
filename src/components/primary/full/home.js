import React from 'react';
import {Row, Col, Container, Button, Form} from 'react-bootstrap';
import {call_xmrig_summary} from "../../../utils/xmrig_calls";

let {dialog} = window.require("electron").remote;
const os = window.require('os');
const path = window.require('path');
const {spawn} = window.require('child_process');
const safex_lib = window.require('safex-addressjs');
const fs = window.require('fs').promises;
const crypto = window.require('crypto');

const access_token = crypto.randomBytes(8).toString('hex');


export default class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            height: "",
            all_info: null,
            pools_list: [
                'pool.safexnews.net:3311',
                'cryptokafa.com:2222',
                'mcafee.safex.io:1111'
            ],
            cpu_count: 0,
            mining_address: '',
            mining_pool: '',
            cpu_choice: 0,
            cpu_type: '',
            save_keys: false,
            mining_active: false
        };
    }

    async componentDidMount() {
        let cpus = os.cpus();

        const xmrig_file = path.join(window.process.resourcesPath, 'xmrig-osx');

        const win_proc = await fs.readdir(window.process.resourcesPath);
        const test_stat = await fs.stat(xmrig_file);
        console.log(test_stat);
        console.log(xmrig_file);
        console.log(win_proc);
        this.setState({cpu_count: cpus.length, cpu_type: cpus[0].model});
    };

    start_mining = (e) => {
        e.preventDefault();
        try {
            if (process.platform === 'darwin') {
                const xmrig_file = path.join(window.process.resourcesPath, 'xmrig-osx');
            } else if (process.platform === 'linux') {
                const xmrig_file = path.join(window.process.resourcesPath, 'xmrig-linux');
            } else if (process.platform === 'win32') {
                const xmrig_file = path.join(window.process.resourcesPath, 'xmrig-win');
            }
            const xmrig_process = spawn(xmrig_file,
                [
                    '--api-worker-id', 'ONE CLICK MINER',
                    '--http-enabled',
                    '--http-host', '127.0.0.1',
                    '--http-port', '9999',
                    '--http-access-token', access_token,
                    '--http-no-restricted',
                    '--coin', 'sfx',
                    '--threads=N', this.state.cpu_choice,
                    '-p', 'ONE CLICK MINER',
                    '-a', 'rx/sfx',
                    '-o', this.state.mining_pool,
                    '-u', this.state.mining_address,
                    '-k'
                ]);

            this.setState(() => ({
                xmrig_pid: xmrig_process.pid
            }));
            this.setState(() => ({
                mining_active: true
            }));


            console.log("Native mining started!");

            let status_check_interval = setInterval(this.check_mining_status, 2000);
            this.setState({
                status_check_interval: status_check_interval,
            });
        } catch (err) {
            console.error(err);
        }

    };

    stop_mining = (e) => {
        e.preventDefault();
        this.setState({
            mining_active: false
        });
        console.log("Ending mining...");
        clearInterval(this.state.status_check_interval);
        this.setState(() => ({
            hashrate: 0
        }));

        console.log(this.state.xmrig_pid);
        spawn('killall', ['xmrig-osx']);

        console.log("Mining was stopped");
    };

    check_mining_status = async () => {
        try {
            let summary = await call_xmrig_summary(access_token);
            console.log(summary);
            if (summary.hashrate === null) {
                this.setState({hashrate: 'connecting threads...'});
            } else if (summary.hashrate > 0) {
                this.setState({hashrate: summary.hashrate});
            }
        } catch (err) {
            console.error(err);
            console.error("error at checking mining status call");
            this.setState({hashrate: "there is an error"});
        }
    };

    set_mining_address = (e) => {
        e.preventDefault();

        let address = e.target.mining_address.value;

        if (!/^Safex[0-9a-zA-Z]{96,108}$/.test(address)) {
            alert("address is not a valid safex address");
        } else {
            try {
                safex_lib.verify_checksum(address);
                this.setState({mining_address: address});
            } catch (err) {
                alert("address is not a valid safex address");
            }
        }
    };

    set_pool_url = (e) => {
        e.preventDefault();
        this.setState({mining_pool: e.target.mining_pool.value})
    };

    set_cpu_count = (e) => {
        e.preventDefault();
        this.setState({cpu_choice: e.target.cpu_choice.value})
    };

    generate_new_address = (e) => {
        e.preventDefault();

        const seed = safex_lib.sc_reduce32(safex_lib.rand_32());
        const keys = safex_lib.create_address(seed);
        const pubkey = safex_lib.pubkeys_to_string(keys.spend.pub, keys.view.pub);
        console.log(keys);

        this.setState({
            mining_address: pubkey,
            keys: keys,
            save_keys: true
        });
    };

    save_keys = async (e) => {
        e.preventDefault();
        let keys_json = {};
        keys_json.public_address = this.state.mining_address;
        keys_json.spend_key = this.state.keys.spend.sec;
        keys_json.view_key = this.state.keys.view.sec;
        keys_json.mnemonic = this.state.keys.mnemonic;

        var date = Date.now();

        try {

            let save_keys_path = dialog.showSaveDialogSync({defaultPath: date + '_mining_keys_unsafe.txt'});
            console.log(save_keys_path);
            try {
                let write_keys = await fs.writeFile(save_keys_path, JSON.stringify(keys_json));

                this.setState({save_keys: false});
            } catch (err) {
                console.error(err);
                console.error("error at writing keys to the file");
            }
        } catch (err) {
            console.error(err);
            console.error("error at getting the 'showsavedialog' ahead of saving keys")
        }

    };

    load_address_from_file = async (e) => {
        e.preventDefault();
        try {
            let load_keys_path = dialog.showOpenDialogSync();
            if (load_keys_path !== undefined) {
                try {
                    let loaded_file = await fs.readFile(load_keys_path[0].toString());
                    let parsed = JSON.parse(loaded_file);
                    if (parsed.public_address === undefined) {
                        alert("file format no good.");
                    } else {
                        console.log(parsed);
                        this.setState({mining_address: parsed.public_address})
                    }
                } catch (err) {
                    console.error(err);
                    console.error("error when reading the file to load keys from")
                }
            }
        } catch (err) {
            console.error(err);
            console.error("error at showopendialog at loading address from file");
        }


    };

    render() {
        var cpu_options = [];
        for (let i = 1; i <= this.state.cpu_count; i += 1) {
            cpu_options.push(<option key={i} value={i}>{i}</option>);
        }
        cpu_options.reverse();
        var pool_options = [];
        for (let i = 0; i <= this.state.pools_list.length; i += 1) {
            pool_options.push(<option key={i} value={this.state.pools_list[i]}>{this.state.pools_list[i]}</option>);
        }

        return (
            <div style={{position: 'relative'}}>
                <Container>
                    <Row>
                        <p>It takes only 3 steps to get going mining</p>
                        <ul>
                            <li>1. set the safex address to mine rewards to</li>
                            <li>2. choose a mining pool to commit your hashrate</li>
                            <li>3. set how much computing resources to allocate</li>
                            <li>And hit Start!</li>


                        </ul>
                    </Row>
                    <Row>
                        {this.state.save_keys ? (
                            <ul>
                                <li>mining address: {this.state.pub_key}</li>
                                <li>secret spend: {this.state.keys.spend.sec}</li>
                                <li>secret view: {this.state.keys.view.sec}</li>

                                <li>seed words: {this.state.keys.mnemonic}</li>
                                <li><Button onClick={this.save_keys} variant="danger">Save Backup File</Button></li>
                                <li>Note: you can use this file to import your mining address in the future</li>
                            </ul>
                        ) : null}


                        {this.state.mining_address.length === 0 ? (

                            <Col> <Form onSubmit={this.set_mining_address}>
                                <Form.Control name="mining_address"
                                              placeholder="Enter the safex address to mine rewards to"/>

                                <Button variant="success" type="submit">
                                    Set Address
                                </Button>
                            </Form>
                                <Button onClick={this.generate_new_address} variant="primary">Generate New
                                    Address</Button>
                                <Button onClick={this.load_address_from_file} variant="primary">Plug Address from
                                    File</Button>
                            </Col>
                        ) : ''}

                        {this.state.mining_address.length > 0 && this.state.mining_pool.length === 0 ? (

                            <Col>
                                <ul>
                                    <li>mining address: {this.state.mining_address}</li>
                                </ul>
                                <Form onSubmit={this.set_pool_url}>
                                    <Form.Control name="mining_pool" as="select">
                                        {pool_options}
                                    </Form.Control>

                                    <Button variant="primary" type="submit">
                                        Set Pool
                                    </Button>
                                </Form>
                            </Col>
                        ) : ''}

                        {this.state.mining_address.length > 0 && this.state.mining_pool.length > 0 && this.state.cpu_choice === 0 ? (

                            <Col>

                                <ul>
                                    <li>mining address: {this.state.mining_address}</li>
                                    <li>pool url: {this.state.mining_pool}</li>
                                </ul>
                                <Form onSubmit={this.set_cpu_count}>
                                    <Form.Control name="cpu_choice" as="select">
                                        {cpu_options}
                                    </Form.Control>

                                    <Button variant="primary" type="submit">
                                        Set Pool
                                    </Button>
                                </Form>
                            </Col>
                        ) : ''}

                        {this.state.mining_address.length > 0 && this.state.mining_pool.length > 0 && this.state.cpu_choice > 0 ? (
                            <Col>
                                <ul>
                                    <li>your cpu type: {this.state.cpu_type}</li>
                                    <li>mining address: {this.state.mining_address}</li>
                                    <li>pool url: {this.state.mining_pool}</li>
                                    <li># of cpus: {this.state.cpu_choice}</li>
                                    <li>hash rate (hashes per second): {this.state.hashrate}</li>
                                    <li>mining
                                        state: {this.state.mining_active ? 'mining is active' : 'mining is not active'}</li>
                                    <li>
                                        {this.state.mining_active ? (
                                                <Button onClick={this.stop_mining}>Stop Mining</Button>)
                                            : (
                                                <Button onClick={this.start_mining} variant="primary">Start
                                                    Mining</Button>)}</li>


                                </ul>
                            </Col>
                        ) : ''}

                    </Row>

                </Container>

            </div>
        );
    }


}
