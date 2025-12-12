using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 火柴人控制器 - 程序化骨骼动画
/// 使用sin()函数模拟行走动画
/// </summary>
public class StickManController : MonoBehaviour
{
    [Header("身体参数")]
    public float bodyHeight = 1.8f;
    public float headRadius = 0.15f;
    public float bodyLength = 0.6f;
    public float limbLength = 0.4f;
    public float limbWidth = 0.05f;

    [Header("动画参数")]
    public float walkSpeed = 0.7f;
    public float animationSpeed = 1f;

    [Header("材质")]
    public Material limbMaterial;

    // 骨骼
    private Transform head;
    private Transform body;
    private Transform hipL, hipR;
    private Transform kneeL, kneeR;
    private Transform footL, footR;
    private Transform shoulderL, shoulderR;
    private Transform elbowL, elbowR;
    private Transform handL, handR;

    // 线渲染器
    private LineRenderer bodyLine;
    private LineRenderer legLLine, legRLine;
    private LineRenderer armLLine, armRLine;

    // 动画时间
    private float walkTime = 0f;
    private float targetSpeed = 0.7f;
    private float currentSpeed = 0.7f;
    private float facing = 0f;
    private float targetFacing = 0f;

    // 引用
    private BaguaCube baguaCube;
    private Vector3 targetPosition;

    void Awake()
    {
        CreateSkeleton();
        CreateVisuals();
    }

    void Start()
    {
        baguaCube = FindObjectOfType<BaguaCube>();
        if (baguaCube != null)
        {
            baguaCube.OnPalaceChanged += OnPalaceChanged;
            UpdateTargetPosition();
        }
    }

    void CreateSkeleton()
    {
        // 创建骨骼层级
        head = CreateBone("Head");
        body = CreateBone("Body");

        hipL = CreateBone("HipL");
        hipR = CreateBone("HipR");
        kneeL = CreateBone("KneeL");
        kneeR = CreateBone("KneeR");
        footL = CreateBone("FootL");
        footR = CreateBone("FootR");

        shoulderL = CreateBone("ShoulderL");
        shoulderR = CreateBone("ShoulderR");
        elbowL = CreateBone("ElbowL");
        elbowR = CreateBone("ElbowR");
        handL = CreateBone("HandL");
        handR = CreateBone("HandR");
    }

    Transform CreateBone(string name)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(transform);
        return obj.transform;
    }

    void CreateVisuals()
    {
        if (limbMaterial == null)
        {
            limbMaterial = new Material(Shader.Find("Unlit/Color"));
            limbMaterial.color = new Color(0.2f, 0.2f, 0.2f);
        }

        // 头部
        GameObject headObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        headObj.name = "HeadVisual";
        headObj.transform.SetParent(head);
        headObj.transform.localPosition = Vector3.zero;
        headObj.transform.localScale = Vector3.one * headRadius * 2;
        headObj.GetComponent<Renderer>().material = limbMaterial;
        Destroy(headObj.GetComponent<Collider>());

        // 身体线
        bodyLine = CreateLimb("BodyLine");

        // 腿部线
        legLLine = CreateLimb("LegL");
        legRLine = CreateLimb("LegR");

        // 手臂线
        armLLine = CreateLimb("ArmL");
        armRLine = CreateLimb("ArmR");
    }

    LineRenderer CreateLimb(string name)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(transform);

        LineRenderer lr = obj.AddComponent<LineRenderer>();
        lr.material = limbMaterial;
        lr.startWidth = limbWidth;
        lr.endWidth = limbWidth;
        lr.positionCount = 3;
        lr.useWorldSpace = true;

        return lr;
    }

    void Update()
    {
        walkTime += Time.deltaTime * animationSpeed;
        currentSpeed = Mathf.Lerp(currentSpeed, targetSpeed, 0.05f);
        facing = Mathf.LerpAngle(facing, targetFacing, 0.1f);

        UpdateAnimation();
    }

    void UpdateAnimation()
    {
        float speed = currentSpeed;
        float t = walkTime * (4f + speed * 6f);
        float swingAmp = 0.5f + speed * 0.3f;

        // 身体位置
        float bounce = Mathf.Abs(Mathf.Sin(t * 2f)) * 0.05f * speed;
        Vector3 bodyPos = transform.position + Vector3.up * bounce;

        // 髋部高度
        float hipY = bodyHeight * 0.45f;
        float shoulderY = bodyHeight * 0.85f;
        float headY = bodyHeight;

        // 更新骨骼位置
        head.position = bodyPos + Vector3.up * headY;

        Vector3 hipCenter = bodyPos + Vector3.up * hipY;
        Vector3 shoulderCenter = bodyPos + Vector3.up * shoulderY;

        // 根据朝向计算侧向
        float facingRad = facing * Mathf.Deg2Rad;
        Vector3 forward = new Vector3(Mathf.Sin(facingRad), 0, Mathf.Cos(facingRad));
        Vector3 right = new Vector3(Mathf.Cos(facingRad), 0, -Mathf.Sin(facingRad));

        float sideView = Mathf.Abs(Mathf.Sin(facingRad));
        float bodyWidth = 0.1f + sideView * 0.1f;

        // 髋部
        hipL.position = hipCenter - right * bodyWidth;
        hipR.position = hipCenter + right * bodyWidth;

        // 肩部
        shoulderL.position = shoulderCenter - right * bodyWidth * 1.2f;
        shoulderR.position = shoulderCenter + right * bodyWidth * 1.2f;

        // 腿部动画
        float rThigh = Mathf.Sin(t) * swingAmp;
        float rShin = Mathf.Sin(t - 0.5f) * swingAmp * 0.8f - 0.3f;
        float lThigh = Mathf.Sin(t + Mathf.PI) * swingAmp;
        float lShin = Mathf.Sin(t + Mathf.PI - 0.5f) * swingAmp * 0.8f - 0.3f;

        // 手臂动画
        float rArm = Mathf.Sin(t + Mathf.PI) * swingAmp * 0.6f;
        float rForearm = Mathf.Sin(t + Mathf.PI - 0.3f) * swingAmp * 0.4f + 0.5f;
        float lArm = Mathf.Sin(t) * swingAmp * 0.6f;
        float lForearm = Mathf.Sin(t - 0.3f) * swingAmp * 0.4f + 0.5f;

        // 计算关节位置
        float legLen = limbLength;
        float armLen = limbLength * 0.8f;

        // 右腿
        kneeR.position = hipR.position + forward * Mathf.Sin(rThigh) * legLen * sideView
                        + Vector3.down * Mathf.Cos(rThigh) * legLen;
        footR.position = kneeR.position + forward * Mathf.Sin(rThigh + rShin) * legLen * sideView
                        + Vector3.down * Mathf.Cos(rThigh + rShin) * legLen;

        // 左腿
        kneeL.position = hipL.position + forward * Mathf.Sin(lThigh) * legLen * sideView
                        + Vector3.down * Mathf.Cos(lThigh) * legLen;
        footL.position = kneeL.position + forward * Mathf.Sin(lThigh + lShin) * legLen * sideView
                        + Vector3.down * Mathf.Cos(lThigh + lShin) * legLen;

        // 右臂
        elbowR.position = shoulderR.position + forward * Mathf.Sin(rArm) * armLen * sideView
                         + Vector3.down * Mathf.Cos(rArm) * armLen;
        handR.position = elbowR.position + forward * Mathf.Sin(rArm + rForearm) * armLen * sideView
                        + Vector3.down * Mathf.Cos(rArm + rForearm) * armLen;

        // 左臂
        elbowL.position = shoulderL.position + forward * Mathf.Sin(lArm) * armLen * sideView
                         + Vector3.down * Mathf.Cos(lArm) * armLen;
        handL.position = elbowL.position + forward * Mathf.Sin(lArm + lForearm) * armLen * sideView
                        + Vector3.down * Mathf.Cos(lArm + lForearm) * armLen;

        // 更新线渲染器
        UpdateLineRenderer(bodyLine, shoulderCenter, hipCenter);
        UpdateLineRenderer(legRLine, hipR.position, kneeR.position, footR.position);
        UpdateLineRenderer(legLLine, hipL.position, kneeL.position, footL.position);
        UpdateLineRenderer(armRLine, shoulderR.position, elbowR.position, handR.position);
        UpdateLineRenderer(armLLine, shoulderL.position, elbowL.position, handL.position);
    }

    void UpdateLineRenderer(LineRenderer lr, Vector3 start, Vector3 end)
    {
        lr.positionCount = 2;
        lr.SetPosition(0, start);
        lr.SetPosition(1, end);
    }

    void UpdateLineRenderer(LineRenderer lr, Vector3 p1, Vector3 p2, Vector3 p3)
    {
        lr.positionCount = 3;
        lr.SetPosition(0, p1);
        lr.SetPosition(1, p2);
        lr.SetPosition(2, p3);
    }

    void OnPalaceChanged(string palaceName)
    {
        UpdateTargetPosition();
    }

    void UpdateTargetPosition()
    {
        if (baguaCube == null) return;

        // 计算朝向 (朝向对面顶点)
        Vector3 frontPos = baguaCube.GetFrontPosition();
        Vector3 backPos = baguaCube.GetBackPosition();
        Vector3 dir = (backPos - frontPos).normalized;

        targetFacing = Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg;
    }

    public void SetSpeed(float speed)
    {
        targetSpeed = Mathf.Clamp01(speed);
    }

    public void SetFacing(float angle)
    {
        targetFacing = angle;
    }

    public void SetPosition(Vector3 pos)
    {
        transform.position = pos;
    }
}
