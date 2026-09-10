import {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class Callcraft implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Callcraft',
    name: 'callcraft',
    icon: 'file:callcraft.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Execute Callcraft AI Specs and extract structured data from documents, images, and text',
    defaults: {
      name: 'Callcraft',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'callcraftApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Call Spec',
            value: 'callSpec',
          },
          {
            name: 'Project',
            value: 'project',
          },
        ],
        default: 'callSpec',
      },

      // Operations: Call Spec
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['callSpec'],
          },
        },
        options: [
          {
            name: 'Execute Spec',
            value: 'execute',
            description: 'Run an AI extraction spec on an image, PDF, or text payload',
            action: 'Execute a call spec',
          },
          {
            name: 'Get Spec Details',
            value: 'get',
            description: 'Retrieve full Call Spec configuration, input schema, and extracted variables',
            action: 'Get a call spec',
          },
          {
            name: 'List Specs',
            value: 'getAll',
            description: 'List Call Specs for the account or filtered by project',
            action: 'List call specs',
          },
        ],
        default: 'execute',
      },

      // Operations: Project
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['project'],
          },
        },
        options: [
          {
            name: 'List Projects',
            value: 'getAll',
            description: 'List all active projects accessible to this credential',
            action: 'List projects',
          },
        ],
        default: 'getAll',
      },

      // Project selector (Dynamic loadOptions)
      {
        displayName: 'Project Name or ID',
        name: 'projectId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getProjects',
        },
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute', 'getAll'],
          },
        },
        default: '',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
      },

      // Spec selector (Dynamic loadOptions dependent on projectId)
      {
        displayName: 'Spec Name or ID',
        name: 'specId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getSpecs',
          loadOptionsDependsOn: ['projectId'],
        },
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute', 'get'],
          },
        },
        default: '',
        required: true,
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
      },

      // Input Source Mode (for execute)
      {
        displayName: 'Input Source',
        name: 'inputSource',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
          },
        },
        options: [
          {
            name: 'Binary File (From Previous Node)',
            value: 'binaryFile',
            description: 'Use an image or PDF file passed as binary data from a previous node',
          },
          {
            name: 'Image / Document URL or Base64 String',
            value: 'urlOrBase64',
            description: 'Provide an HTTP/HTTPS URL or Base64 data string directly',
          },
          {
            name: 'Text Only / Custom Parameters',
            value: 'textOnly',
            description: 'Do not attach a document file; process via prompt and context variables only',
          },
        ],
        default: 'binaryFile',
        description: 'How to supply the document or input media to Callcraft',
      },

      // Binary property name
      {
        displayName: 'Binary Property Name',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
            inputSource: ['binaryFile'],
          },
        },
        description: 'Name of the binary property in the incoming item (default: data)',
        required: true,
      },

      // Document URL or Base64
      {
        displayName: 'Image / Document URL or Base64',
        name: 'imageUrlOrBase64',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
            inputSource: ['urlOrBase64'],
          },
        },
        placeholder: 'https://example.com/invoice.pdf or data:image/png;base64,...',
        description: 'URL or Base64 data string of the document to process',
      },

      // Custom User Prompt
      {
        displayName: 'Additional Prompt',
        name: 'additionalPrompt',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        default: '',
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
          },
        },
        description: 'Optional custom instruction or focus to pass to the AI model',
      },

      // Variables (JSON or Key-Value)
      {
        displayName: 'Context Variables (JSON)',
        name: 'variablesJson',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
          },
        },
        description: 'JSON object containing dynamic variables interpolated into {{placeholders}} in the spec prompts',
      },

      // Additional Execution Options
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            resource: ['callSpec'],
            operation: ['execute'],
          },
        },
        options: [
          {
            displayName: 'AI Model Override',
            name: 'aiModelName',
            type: 'string',
            default: '',
            placeholder: 'gemini-3.6-flash',
            description: 'Override the AI model configured in the spec',
          },
          {
            displayName: 'Negative Prompt',
            name: 'negativePrompt',
            type: 'string',
            default: '',
            description: 'Constraints or prohibitions for the AI extraction',
          },
          {
            displayName: 'Return Full Envelope',
            name: 'returnFullEnvelope',
            type: 'boolean',
            default: false,
            description: 'Whether to return the complete Callcraft metadata & execution trace envelope or just the coerced data object',
          },
          {
            displayName: 'Show Prompt in Trace',
            name: 'showPrompt',
            type: 'boolean',
            default: false,
            description: 'Whether to include the assembled prompt in the execution trace',
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('callcraftApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

        try {
          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'GET',
            url: `${baseUrl}/v1/projects`,
            json: true,
          });

          const projects = response.data || [];
          const options: INodePropertyOptions[] = [
            {
              name: '— All Projects —',
              value: '',
            },
          ];

          for (const project of projects) {
            options.push({
              name: project.name,
              value: project.id,
              description: `Slug: ${project.slug} (${project.specsCount || 0} specs)`,
            });
          }

          return options;
        } catch (error: any) {
          throw new NodeOperationError(this.getNode(), `Failed to load Callcraft projects: ${error.message}`);
        }
      },

      async getSpecs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('callcraftApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
        const projectId = this.getCurrentNodeParameter('projectId') as string;

        try {
          const url = projectId
            ? `${baseUrl}/v1/specs?projectId=${encodeURIComponent(projectId)}`
            : `${baseUrl}/v1/specs`;

          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'GET',
            url,
            json: true,
          });

          const specs = response.data || [];
          return specs.map((spec: any) => ({
            name: spec.name,
            value: spec.slug || spec.id,
            description: spec.description ? `${spec.slug} — ${spec.description}` : spec.slug,
          }));
        } catch (error: any) {
          throw new NodeOperationError(this.getNode(), `Failed to load Callcraft specs: ${error.message}`);
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    const credentials = await this.getCredentials('callcraftApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'project' && operation === 'getAll') {
          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'GET',
            url: `${baseUrl}/v1/projects`,
            json: true,
          });
          const projects = response.data || [];
          for (const proj of projects) {
            returnData.push({ json: proj, pairedItem: { item: i } });
          }
        } else if (resource === 'callSpec' && operation === 'getAll') {
          const projectId = this.getNodeParameter('projectId', i, '') as string;
          const url = projectId
            ? `${baseUrl}/v1/specs?projectId=${encodeURIComponent(projectId)}`
            : `${baseUrl}/v1/specs`;

          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'GET',
            url,
            json: true,
          });
          const specs = response.data || [];
          for (const spec of specs) {
            returnData.push({ json: spec, pairedItem: { item: i } });
          }
        } else if (resource === 'callSpec' && operation === 'get') {
          const specId = this.getNodeParameter('specId', i) as string;
          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'GET',
            url: `${baseUrl}/v1/specs?specId=${encodeURIComponent(specId)}`,
            json: true,
          });
          returnData.push({ json: response.data || response, pairedItem: { item: i } });
        } else if (resource === 'callSpec' && operation === 'execute') {
          const specId = this.getNodeParameter('specId', i) as string;
          const inputSource = this.getNodeParameter('inputSource', i) as string;
          const additionalPrompt = this.getNodeParameter('additionalPrompt', i, '') as string;
          const variablesJson = this.getNodeParameter('variablesJson', i, '{}');
          const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

          let variables: any = {};
          if (typeof variablesJson === 'string' && variablesJson.trim().length > 0) {
            try {
              variables = JSON.parse(variablesJson);
            } catch (err) {
              throw new NodeOperationError(this.getNode(), `Invalid JSON in Context Variables: ${err}`);
            }
          } else if (typeof variablesJson === 'object') {
            variables = variablesJson;
          }

          const bodyPayload: any = {
            variables,
          };

          if (additionalPrompt && additionalPrompt.trim()) {
            bodyPayload.prompt = additionalPrompt.trim();
          }

          if (additionalOptions.negativePrompt && additionalOptions.negativePrompt.trim()) {
            bodyPayload.negativePrompt = additionalOptions.negativePrompt.trim();
          }

          if (inputSource === 'binaryFile') {
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
            const mimeType = binaryData.mimeType || 'image/jpeg';
            bodyPayload.file = `data:${mimeType};base64,${buffer.toString('base64')}`;
          } else if (inputSource === 'urlOrBase64') {
            const imageUrlOrBase64 = this.getNodeParameter('imageUrlOrBase64', i) as string;
            if (imageUrlOrBase64 && imageUrlOrBase64.trim()) {
              bodyPayload.file = imageUrlOrBase64.trim();
            }
          }

          const headers: Record<string, string> = {
            'X-CALL-SPEC-ID': specId,
          };

          if (additionalOptions.aiModelName && additionalOptions.aiModelName.trim()) {
            headers['X-AI-MODEL-NAME'] = additionalOptions.aiModelName.trim();
          }

          if (additionalOptions.showPrompt) {
            headers['X-CALL-SHOW-PROMPT'] = 'true';
          }

          const response = await this.helpers.httpRequestWithAuthentication.call(this, 'callcraftApi', {
            method: 'POST',
            url: `${baseUrl}/v1/call`,
            headers,
            body: bodyPayload,
            json: true,
          });

          if (additionalOptions.returnFullEnvelope) {
            returnData.push({ json: response, pairedItem: { item: i } });
          } else {
            const resultData = response.data || response;
            returnData.push({ json: resultData, pairedItem: { item: i } });
          }
        }
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error.message, details: error.response?.data || error },
            pairedItem: { item: i },
          });
        } else {
          throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
        }
      }
    }

    return [returnData];
  }
}
