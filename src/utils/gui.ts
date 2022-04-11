import { GUI } from 'dat.gui'

export function initGUI(uniforms: any) {
    const gui = new GUI()

    let counter = 1
    Object.values(uniforms).forEach(
        value => {

            const layer = value as any

            if (layer.value.flowDirection) {
                const flowDirection01 = gui.addFolder(`Layer ${counter} Flow Direction`);
                flowDirection01.add(layer.value.flowDirection, 'x', -1, 1, 0.01)
                flowDirection01.add(layer.value.flowDirection, 'y', -1, 1, 0.01)
                flowDirection01.open()
            }

            if (layer.value.flowSpeed) {
                const flowSpeed1 = gui.addFolder(`Layer ${counter} Flow Speed`);
                flowSpeed1.add(layer.value, 'flowSpeed', 0.00003, 0.0008, 0.00001)
                flowSpeed1.open()
            }

            if (layer.value.repeat) {
                const repeatd1 = gui.addFolder(`Layer ${counter} Flow Repeat`);
                repeatd1.add(layer.value.repeat, 'x', 1, 5, 0.005)
                repeatd1.add(layer.value.repeat, 'y', 1, 5, 0.005)
                repeatd1.open()
            }

            counter++
        }
    )

}