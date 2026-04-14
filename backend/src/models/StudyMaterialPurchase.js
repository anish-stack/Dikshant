'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

    class StudyMaterialPurchase extends Model {
        static associate(models) {

            StudyMaterialPurchase.belongsTo(models.StudyMaterial, {
                foreignKey: "materialId",
                as: "material"
            });

            StudyMaterialPurchase.belongsTo(models.User, {
                foreignKey: "userId",
                as: "user"
            });

        }
    }

    StudyMaterialPurchase.init({

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        studentName: {
            type: DataTypes.STRING,
            allowNull: false
        },

        contactNumber: {
            type: DataTypes.STRING,
            allowNull: false
        },

        address: {
            type: DataTypes.TEXT
        },

        pincode: {
            type: DataTypes.STRING
        },

        materialId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        paymentId: {
            type: DataTypes.STRING
        },

        orderId: {
            type: DataTypes.STRING
        },

        paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'admin-assigned'),
            defaultValue: 'pending'
        },

        purchasePrice: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },

        currency: {
            type: DataTypes.STRING,
            defaultValue: 'INR'
        },

        accessType: {
            type: DataTypes.ENUM('lifetime', 'limited'),
            defaultValue: 'lifetime'
        },

        purchaseDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },

        expiryDate: {
            type: DataTypes.DATE
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        notes: {
            type: DataTypes.TEXT
        },

        // 📦 Delivery fields for hard copy

        deliveryStatus: {
            type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
            defaultValue: 'pending'
        },

        courierName: {
            type: DataTypes.STRING
        },

        trackingNumber: {
            type: DataTypes.STRING
        },

        dispatchedAt: {
            type: DataTypes.DATE
        },

        deliveredAt: {
            type: DataTypes.DATE
        }

    }, {
        sequelize,
        modelName: 'StudyMaterialPurchase',
        tableName: 'study_material_purchases',
        timestamps: true
    });

    return StudyMaterialPurchase;
};