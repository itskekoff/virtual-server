const {Vec3} = require("vec3");
const {RaycastIterator} = require("./raycast");

class Projection {
    static getLookVector(yaw, pitch) {
        const csPitch = Math.cos(pitch);
        const snPitch = Math.sin(pitch);
        const csYaw = Math.cos(yaw);
        const snYaw = Math.sin(yaw);
        return new Vec3(-snYaw * csPitch, snPitch, -csYaw * csPitch);
    }

    static isLookingAt(playerPos, boundingBox, eyePosition, entityPosition, maxDistance = 9) {
        // TODO: Исправить проекцию лучей, возможно проблема в формах
        const eyeDirection = new Vec3(
            -Math.sin(playerPos.yaw) * Math.cos(playerPos.pitch),
            Math.sin(playerPos.pitch),
            -Math.cos(playerPos.yaw) * Math.cos(playerPos.pitch)
        );

        const boxAmplification = 2;

        const rayIterator = new RaycastIterator(eyePosition, eyeDirection.normalize(), maxDistance)
        const playerPosVec = new Vec3(playerPos.x, playerPos.y, playerPos.z);
        const shapes = [[-0.3 * boxAmplification, 0, -0.3 * boxAmplification, 0.3 * boxAmplification, 1.62, 0.3 * boxAmplification]];
        const intersect = rayIterator.intersect(shapes, entityPosition);
        const entityDir = entityPosition.minus(playerPosVec);

        if (intersect) {
            const sign = Math.sign(entityDir.dot(eyeDirection));
            return sign !== -1;
        }
    }
}

module.exports = {Projection};
