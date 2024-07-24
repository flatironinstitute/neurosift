/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback } from "react";
import {RemoteH5File, getRemoteH5File, RemoteH5FileLindi, getRemoteH5FileLindi} from '@remote-h5-file/index'

type TestPageProps = {
    width: number
    height: number
}

const TestPage: FunctionComponent<TestPageProps> = () => {
    const handleRunTest = useCallback(() => {
        test_h5()
    }, [])
    return (
        <div style={{padding: 20}}>
            <p>
                Click one of the buttons below to run a test, and view the console for the results.
            </p>
            <p>
                <button onClick={handleRunTest}>run h5 test</button>
            </p>
            <p>
                <button onClick={test_lindi}>run lindi test</button>
            </p>
        </div>
    )
}

const test_h5 = async () => {
    const x = new RemoteH5FileSliceBenchmark()
    const h5_url = 'https://api.dandiarchive.org/api/assets/c04f6b30-82bf-40e1-9210-34f0bcd8be24/download/'
    const object_name = '/acquisition/ElectricalSeriesAp/data'
    const slice = [[0, 20]] as [number, number][]
    await x.setup(h5_url, object_name, slice)
    await x.time_slice(h5_url, object_name, slice)
}

const test_lindi = async () => {
    const x = new RemoteLindiFileSliceBenchmark()
    const lindi_url = 'https://lindi.neurosift.org/dandi/dandisets/000409/assets/c04f6b30-82bf-40e1-9210-34f0bcd8be24/nwb.lindi.json'
    const object_name = '/acquisition/ElectricalSeriesAp/data'
    const slice = [[0, 20]] as [number, number][]
    await x.setup(lindi_url, object_name, slice)
    await x.time_slice(lindi_url, object_name, slice)
}

class RemoteH5FileSliceBenchmark {
    #remoteFile: RemoteH5File | undefined
    #cacheBust = cacheBust()
    async setup(h5_url: string, object_name: string, slice: [number, number][] | undefined) {
        console.info('Setting up remote file...', h5_url, object_name, slice)
        this.#remoteFile = await getRemoteH5File(h5_url + `?cb=${this.#cacheBust}`)
        // read metadata during setup
        this.#remoteFile.getDataset(object_name)
    }
    async time_slice(h5_url: string, object_name: string, slice: [number, number][] | undefined) {
        console.info('Running time_slice...', h5_url, object_name, slice)
        if (this.#remoteFile === undefined) {
            throw new Error("remote file not initialized")
        }
        const timer = Date.now()
        const data = await this.#remoteFile.getDatasetData(object_name, {slice})
        const elapsed = (Date.now() - timer) / 1000
        console.info('data:', data)
        console.info('elapsed:', elapsed)
    }
}

class RemoteLindiFileSliceBenchmark {
    #remoteFile: RemoteH5FileLindi | undefined
    async setup(lindi_url: string, object_name: string, slice: [number, number][] | undefined) {
        console.info('Setting up remote file...', lindi_url, object_name, slice)
        this.#remoteFile = await getRemoteH5FileLindi(lindi_url)
        this.#remoteFile._disableCache()
    }
    async time_slice(lindi_url: string, object_name: string, slice: [number, number][] | undefined) {
        console.info('Running time_slice...', lindi_url, object_name, slice)
        if (this.#remoteFile === undefined) {
            throw new Error("remote file not initialized")
        }
        const timer = Date.now()
        const data = await this.#remoteFile.getDatasetData(object_name, {slice})
        const elapsed = (Date.now() - timer) / 1000
        console.info('data:', data)
        console.info('elapsed:', elapsed)
    }
}

let cb = 0
const cacheBust = () => {
    return cb++
}

export default TestPage