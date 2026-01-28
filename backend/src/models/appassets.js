module.exports = (sequelize, DataTypes) => {
    const AppAssets = sequelize.define(
        "AppAssets",
        {
            quizVideoIntro: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            testSeriesVideoIntro: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            onboardingImageOne: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            onboardingImageTwo: {
                type: DataTypes.STRING,
                allowNull: true,
            },

        },

        {
            tableName: "app_assets",
            timestamps: true,
        }
    );

    return AppAssets;
};
