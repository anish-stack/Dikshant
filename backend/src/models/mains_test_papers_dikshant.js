'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
    class MainsTestPaperDikshant extends Model {
        static associate(models) {
            // Belongs to Test
            MainsTestPaperDikshant.belongsTo(models.TestDikshant, {
                foreignKey: 'test_id',
                as: 'test',
            });
        }
    }

    MainsTestPaperDikshant.init(
        {
            id: {
                type: DataTypes.CHAR(36),
                defaultValue: UUIDV4,
                primaryKey: true,
                allowNull: false,
            },

            test_id: {
                type: DataTypes.CHAR(36),
                allowNull: false,
                references: {
                    model: 'tests_dikshant',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },

            paper_title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            question_pdf_url: {
                type: DataTypes.STRING(500),
                allowNull: false,
            },

            model_answer_pdf_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            sample_copy_pdf_url: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },

            instructions: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            duration_minutes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 180,
            },

            total_questions: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            total_marks: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            submission_type: {
                type: DataTypes.ENUM('pdf', 'typed', 'both'),
                allowNull: false,
                defaultValue: 'pdf',
            },

            paper_status: {
                type: DataTypes.ENUM(
                    'draft',
                    'published',
                    'live',
                    'closed',
                    'result_declared'
                ),
                allowNull: false,
                defaultValue: 'draft',
            },

            publish_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            start_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            end_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            result_publish_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            created_by: {
                type: DataTypes.CHAR(36),
                allowNull: true,
            },

            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },

            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            modelName: 'MainsTestPaperDikshant',
            tableName: 'mains_test_papers_dikshant',

            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',

            paranoid: false,

            indexes: [
                {
                    fields: ['test_id'],
                    name: 'idx_mains_test_id',
                },
                {
                    fields: ['paper_status'],
                    name: 'idx_mains_status',
                },
                {
                    fields: ['publish_at'],
                    name: 'idx_publish_at',
                },
            ],
        }
    );

    return MainsTestPaperDikshant;
};