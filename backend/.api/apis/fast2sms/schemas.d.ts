declare const GetDevbulkV2: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly authorization: {
                    readonly type: "string";
                    readonly default: "YOUR_API_KEY";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Provide \"YOUR_API_KEY\". ";
                };
                readonly sender_id: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Your 3-6 letter DLT approved Sender ID like \"FSTSMS\", before using you need to first submit it to Fast2SMS for approval.";
                };
                readonly message: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Your Message_ID like, \"111111\" you can get your approved Message ID.";
                };
                readonly variables_values: {
                    readonly type: "string";
                    readonly default: "var1|var2";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "If you've used {#var#} inside your DLT approved SMS then you can submit values for those variables like: \"Rahul|8888888888|6695\" seperated by pipe \"|\".";
                };
                readonly route: {
                    readonly type: "string";
                    readonly default: "dlt";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "For DLT SMS route use \"dlt\"";
                };
                readonly numbers: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "You can send multiple mobile numbers seperated by comma like: \"8888888888,9999999999,6666666666\"";
                };
                readonly flash: {
                    readonly type: "string";
                    readonly enum: readonly ["0", "1"];
                    readonly default: "0";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "This field is optional, it will use \"0\" as default value or you can set to \"1\" for sending flash message.";
                };
                readonly schedule_time: {
                    readonly type: "string";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "This field is optional, it will use \"null\" as default value or you can set to a future date and time in format YYYY-MM-DD-HH-MM";
                };
            };
            readonly required: readonly ["authorization", "sender_id", "message", "variables_values", "route", "numbers"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly return: {
                    readonly type: "boolean";
                    readonly default: "true";
                };
                readonly request_id: {
                    readonly type: "string";
                    readonly default: "lwdtp7cjyqxvfe9";
                };
                readonly message: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                    readonly default: "Message sent successfully";
                };
            };
            readonly required: readonly ["return", "request_id", "message"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetDevbulkV21: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly sender_id: {
                readonly type: "string";
                readonly description: "Your 3-6 letter DLT approved Sender ID like \"FSTSMS\", before using you need to first submit it to Fast2SMS for approval";
            };
            readonly message: {
                readonly type: "integer";
                readonly description: "Your Message_ID like, \"111111\" you can get your approved Message ID here.";
            };
            readonly variables_values: {
                readonly type: "string";
                readonly description: "If you've used {#var#} inside your DLT approved SMS then you can submit values for those variables like: \"Rahul|8888888888|6695\" seperated by pipe \"|\".";
                readonly default: "var1|var2";
            };
            readonly route: {
                readonly type: "string";
                readonly description: "For DLT SMS route use \"dlt\"";
                readonly default: "dlt";
            };
            readonly numbers: {
                readonly type: "string";
                readonly description: "You can send multiple mobile numbers seperated by comma like: \"8888888888,9999999999,6666666666\"";
            };
            readonly flash: {
                readonly type: "string";
                readonly enum: readonly ["0", "1"];
                readonly default: "0";
            };
            readonly schedule_time: {
                readonly type: "string";
                readonly description: "This field is optional, it will use \"null\" as default value or you can set to a future date and time in format YYYY-MM-DD-HH-MM";
            };
        };
        readonly required: readonly ["sender_id", "variables_values", "route", "numbers"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly authorization: {
                    readonly type: "string";
                    readonly default: "YOUR_API_KEY";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Provide \"YOUR_API_KEY\".";
                };
            };
            readonly required: readonly ["authorization"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly return: {
                    readonly type: "boolean";
                    readonly default: "true";
                };
                readonly request_id: {
                    readonly type: "string";
                    readonly default: "lwdtp7cjyqxvfe9";
                };
                readonly message: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                    readonly default: "Message sent successfully";
                };
            };
            readonly required: readonly ["return"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetDevdlt: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["sender", "template"];
                    readonly default: "template";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Set to \"template\" for template information or \"sender\" for sender information.";
                };
            };
            readonly required: readonly ["type"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly authorization: {
                    readonly type: "string";
                    readonly default: "YOUR_API_KEY";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Provide \"YOUR_API_KEY\".";
                };
            };
            readonly required: readonly ["authorization"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                    readonly default: "true";
                };
                readonly data: {
                    readonly type: "array";
                    readonly items: {
                        readonly properties: {
                            readonly sender_id: {
                                readonly type: "string";
                            };
                            readonly entity_id: {
                                readonly type: "string";
                            };
                            readonly entity_name: {
                                readonly type: "string";
                            };
                            readonly templates: {
                                readonly type: "array";
                                readonly items: {
                                    readonly properties: {
                                        readonly message_id: {
                                            readonly type: "string";
                                        };
                                        readonly message: {
                                            readonly type: "string";
                                        };
                                        readonly var_count: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly type: "object";
                                    readonly required: readonly ["message_id", "message", "var_count"];
                                };
                            };
                        };
                        readonly type: "object";
                        readonly required: readonly ["sender_id", "entity_id", "templates"];
                    };
                };
            };
            readonly required: readonly ["success", "data"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetDevdlt1: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly authorization: {
                    readonly type: "string";
                    readonly default: "YOUR_API_KEY";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Provide \"YOUR_API_KEY\".";
                };
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["template", "sender"];
                    readonly default: "sender";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Set to \"template\" for template information or \"sender\" for sender information.";
                };
            };
            readonly required: readonly ["authorization", "type"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                    readonly default: "true";
                };
                readonly data: {
                    readonly type: "array";
                    readonly items: {
                        readonly properties: {
                            readonly sender_id: {
                                readonly type: "string";
                            };
                            readonly entity_id: {
                                readonly type: "string";
                            };
                            readonly entity_name: {
                                readonly type: "string";
                            };
                        };
                        readonly type: "object";
                        readonly required: readonly ["sender_id", "entity_id", "entity_name"];
                    };
                };
            };
            readonly required: readonly ["success", "data"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const PostDevbulkV21: {
    readonly body: {
        readonly type: "object";
        readonly properties: {
            readonly route: {
                readonly type: "string";
                readonly default: "dlt";
                readonly description: "The SMS route. For DLT SMS, always use \"dlt\".";
            };
            readonly requests: {
                readonly type: "array";
                readonly items: {
                    readonly properties: {
                        readonly sender_id: {
                            readonly type: "string";
                            readonly description: "Your 3-6 letter DLT approved Sender ID like \"FSTSMS\", before using you need to first submit it to Fast2SMS for approval.";
                        };
                        readonly message: {
                            readonly type: "integer";
                            readonly description: "Your Message_ID like, \"111111\" you can get your approved Message ID here.";
                        };
                        readonly variables_values: {
                            readonly type: "string";
                            readonly description: "If you've used {#var#} inside your DLT approved SMS then you can submit values for those variables like: \"Rahul|8888888888|6695\" seperated by pipe \"|\".";
                            readonly default: "var1|var2";
                        };
                        readonly numbers: {
                            readonly type: "string";
                            readonly description: "Add mobile numbers";
                        };
                        readonly flash: {
                            readonly type: "string";
                            readonly enum: readonly ["0", "1"];
                            readonly default: "0";
                            readonly description: "This field is optional, it will use \"0\" as default value or you can set to \"1\" for sending flash message.";
                        };
                    };
                    readonly type: "object";
                    readonly required: readonly ["sender_id", "numbers", "variables_values", "message"];
                };
                readonly description: "An array of objects containing SMS details.";
            };
        };
        readonly required: readonly ["route", "requests"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly authorization: {
                    readonly type: "string";
                    readonly default: "YOUR_API_KEY";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Provide \"YOUR_API_KEY\".";
                };
            };
            readonly required: readonly ["authorization"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly return: {
                    readonly type: "boolean";
                    readonly default: "true";
                };
                readonly request_id: {
                    readonly type: "string";
                    readonly default: "KPBjLltJT9Ni4kR";
                };
                readonly message: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                    readonly default: "SMS sent successfully";
                    readonly description: "";
                };
            };
            readonly required: readonly ["return"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
export { GetDevbulkV2, GetDevbulkV21, GetDevdlt, GetDevdlt1, PostDevbulkV21 };
